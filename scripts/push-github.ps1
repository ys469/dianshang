[CmdletBinding()]
param(
  [string]$CommitMessage,
  [string]$RemoteName = 'origin',
  [string]$Branch,
  [string]$Token,
  [switch]$SkipAdd,
  [switch]$SkipCommit,
  [switch]$IncludeUntracked,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Join-Lines {
  param([object[]]$Lines)

  if (-not $Lines) {
    return ''
  }

  return (($Lines | ForEach-Object {
        if ($null -eq $_) {
          ''
        } else {
          $_.ToString()
        }
      }) -join [Environment]::NewLine).Trim()
}

function Invoke-Git {
  param(
    [Parameter(Mandatory)]
    [string[]]$Arguments,
    [Parameter(Mandatory)]
    [string]$WorkingDirectory,
    [string[]]$DisplayArguments,
    [switch]$AllowFailure
  )

  $output = & git -C $WorkingDirectory @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = Join-Lines -Lines $output
  $displayText = if ($DisplayArguments) {
    $DisplayArguments -join ' '
  } else {
    $Arguments -join ' '
  }

  if (-not $AllowFailure -and $exitCode -ne 0) {
    throw "git $displayText failed.`n$text"
  }

  return [PSCustomObject]@{
    ExitCode = $exitCode
    Text = $text
  }
}

function Read-RequiredLine {
  param([Parameter(Mandatory)][string]$Prompt)

  while ($true) {
    $value = (Read-Host $Prompt).Trim()
    if ($value) {
      return $value
    }
    Write-Host 'Input cannot be empty. Please try again.' -ForegroundColor Yellow
  }
}

function Read-TokenValue {
  param([Parameter(Mandatory)][string]$Prompt)

  $secure = Read-Host $Prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)

  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Mask-RemoteUrl {
  param([Parameter(Mandatory)][string]$RemoteUrl)

  if ($RemoteUrl -match '^https://') {
    return $RemoteUrl
  }

  return '<non-https-remote>'
}

function Build-AuthenticatedRemoteUrl {
  param(
    [Parameter(Mandatory)][string]$RemoteUrl,
    [Parameter(Mandatory)][string]$TokenValue
  )

  if ($RemoteUrl -notmatch '^https://') {
    throw "This script only supports HTTPS remotes. Current remote: $RemoteUrl"
  }

  $encodedToken = [Uri]::EscapeDataString($TokenValue)
  $plainRemote = $RemoteUrl.Substring('https://'.Length)

  return [PSCustomObject]@{
    PushUrl = "https://x-access-token:$encodedToken@$plainRemote"
    MaskedPushUrl = "https://x-access-token:***@$plainRemote"
  }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'git was not found. Install Git for Windows first.'
}

$repoCheck = Invoke-Git -Arguments @('rev-parse', '--show-toplevel') -WorkingDirectory (Get-Location).Path -AllowFailure
if ($repoCheck.ExitCode -ne 0 -or -not $repoCheck.Text) {
  throw 'The current directory is not inside a git repository.'
}

$repoRoot = $repoCheck.Text

if (-not $Branch) {
  $Branch = (Invoke-Git -Arguments @('branch', '--show-current') -WorkingDirectory $repoRoot).Text
}

if (-not $Branch) {
  throw 'No active branch was found. Switch to a branch before pushing.'
}

$remoteUrl = (Invoke-Git -Arguments @('remote', 'get-url', $RemoteName) -WorkingDirectory $repoRoot).Text
if (-not $remoteUrl) {
  throw "Remote '$RemoteName' was not found."
}

$trackedBefore = (Invoke-Git -Arguments @('status', '--short') -WorkingDirectory $repoRoot).Text
$untrackedFiles = @()
$untrackedText = (Invoke-Git -Arguments @('ls-files', '--others', '--exclude-standard') -WorkingDirectory $repoRoot).Text
if ($untrackedText) {
  $untrackedFiles = $untrackedText -split "(`r`n|`n|`r)" | Where-Object { $_.Trim() }
}

if (-not $DryRun -and -not $SkipAdd) {
  Write-Host 'Staging tracked changes...' -ForegroundColor Cyan
  [void](Invoke-Git -Arguments @('add', '-u') -WorkingDirectory $repoRoot)

  if ($untrackedFiles.Count -gt 0) {
    $shouldIncludeUntracked = $IncludeUntracked.IsPresent

    if (-not $shouldIncludeUntracked) {
      Write-Host 'Untracked files detected:' -ForegroundColor Yellow
      $untrackedFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
      $answer = (Read-Host 'Include untracked files in this commit? Type y to confirm').Trim().ToLowerInvariant()
      $shouldIncludeUntracked = $answer -in @('y', 'yes')
    }

    if ($shouldIncludeUntracked) {
      Write-Host 'Staging untracked files...' -ForegroundColor Cyan
      [void](Invoke-Git -Arguments (@('add', '--') + $untrackedFiles) -WorkingDirectory $repoRoot)
    }
  }
}

$stagedChanges = (Invoke-Git -Arguments @('diff', '--cached', '--name-only') -WorkingDirectory $repoRoot).Text
$hasStagedChanges = [bool]$stagedChanges

$resolvedCommitMessage = $CommitMessage
if (-not $DryRun -and -not $SkipCommit -and $hasStagedChanges -and -not $resolvedCommitMessage) {
  $resolvedCommitMessage = Read-RequiredLine -Prompt 'Enter commit message'
}

if (-not $DryRun -and -not $SkipCommit -and $hasStagedChanges) {
  Write-Host "Creating commit: $resolvedCommitMessage" -ForegroundColor Cyan
  [void](Invoke-Git -Arguments @('commit', '-m', $resolvedCommitMessage) -WorkingDirectory $repoRoot)
} elseif (-not $DryRun -and -not $SkipCommit -and -not $hasStagedChanges) {
  Write-Host 'No staged changes found. Skipping commit.' -ForegroundColor Yellow
}

$pushInfo = $null
if (-not $DryRun) {
  if (-not $Token) {
    $Token = $env:GITHUB_TOKEN
  }

  if (-not $Token) {
    $Token = Read-TokenValue -Prompt 'Enter GitHub PAT'
  }

  if (-not $Token) {
    throw 'No GitHub PAT was provided.'
  }

  $pushInfo = Build-AuthenticatedRemoteUrl -RemoteUrl $remoteUrl -TokenValue $Token
}

if ($DryRun) {
  Write-Host 'Dry run: no git add, git commit, or git push will be executed.' -ForegroundColor Green
  Write-Host "Repo root: $repoRoot"
  Write-Host "Remote: $RemoteName"
  Write-Host "Branch: $Branch"
  Write-Host "Remote URL: $(Mask-RemoteUrl -RemoteUrl $remoteUrl)"
  Write-Host 'Current status:'
  if ($trackedBefore) {
    Write-Host $trackedBefore
  } else {
    Write-Host '  Working tree is currently clean.'
  }

  if (-not $SkipAdd) {
    Write-Host 'Dry run: tracked changes would be staged.'
    if ($untrackedFiles.Count -gt 0) {
      if ($IncludeUntracked) {
        Write-Host 'Dry run: untracked files would also be staged:'
      } else {
        Write-Host 'Dry run: untracked files were detected. The real run would ask whether to include them:'
      }
      $untrackedFiles | ForEach-Object { Write-Host "  - $_" }
    }
  } else {
    Write-Host 'Dry run: SkipAdd is set, so files would not be staged automatically.'
  }

  if (-not $SkipCommit) {
    if ($CommitMessage) {
      Write-Host "Dry run: commit message would be: $CommitMessage"
    } else {
      Write-Host 'Dry run: the real run would prompt for a commit message when needed.'
    }
  } else {
    Write-Host 'Dry run: SkipCommit is set, so no commit would be created.'
  }

  Write-Host "Dry run: push target would be HEAD -> refs/heads/$Branch"
  Write-Host 'Dry run complete.'
  exit 0
}

if (-not $pushInfo) {
  throw 'Push configuration was not prepared.'
}

Write-Host 'Pushing to GitHub...' -ForegroundColor Cyan
Write-Host "Remote: $RemoteName"
Write-Host "Branch: $Branch"
Write-Host "Push target: $($pushInfo.MaskedPushUrl)"

[void](Invoke-Git `
    -Arguments @('push', $pushInfo.PushUrl, "HEAD:refs/heads/$Branch") `
    -DisplayArguments @('push', $pushInfo.MaskedPushUrl, "HEAD:refs/heads/$Branch") `
    -WorkingDirectory $repoRoot)

Write-Host 'GitHub push completed successfully.' -ForegroundColor Green
