# GitHub 推送脚本

这个仓库提供了一个 Windows 可直接使用的 GitHub 推送脚本：

- 主脚本：`scripts/push-github.ps1`
- 快捷入口：`push-github.bat`

## 最常用的用法

在项目根目录执行：

```powershell
.\push-github.bat
```

脚本会按顺序做这些事：

1. 检查当前目录是不是 Git 仓库
2. 自动识别当前分支
3. 暂存已跟踪文件变更
4. 发现未跟踪文件时询问是否一并加入
5. 提示你输入提交说明
6. 读取 `GITHUB_TOKEN`，如果没配置就临时提示输入 GitHub PAT
7. 推送到当前分支对应的 GitHub 远程分支

## 推荐先做一次演练

```powershell
.\push-github.bat -DryRun -SkipAdd -SkipCommit
```

这个模式不会真的提交，也不会真的推送，只会把它打算做的事情打印出来。

## 常见命令

直接交互式推送：

```powershell
.\push-github.bat
```

提前给好提交说明：

```powershell
.\push-github.bat -CommitMessage "feat: update latest mall changes"
```

已经手动 `git add` 和 `git commit` 过，只想推送：

```powershell
.\push-github.bat -SkipAdd -SkipCommit
```

需要把新文件也自动纳入：

```powershell
.\push-github.bat -IncludeUntracked
```

指定其他远程名：

```powershell
.\push-github.bat -RemoteName origin
```

## 推荐的 Token 方式

推荐把 GitHub PAT 临时放到当前 PowerShell 会话里：

```powershell
$env:GITHUB_TOKEN = "你的GitHubPAT"
.\push-github.bat -CommitMessage "chore: sync latest version"
```

这样脚本会直接使用这个变量，不再二次询问。

## 安全说明

- 脚本不会修改 `origin` 配置
- Token 只用于这一次 `git push`
- 输出里会隐藏 Token，不会明文显示

## 失败时优先检查

1. 当前目录是不是仓库根目录
2. 当前分支是不是正常分支，而不是 detached HEAD
3. GitHub PAT 是否有仓库写权限
4. 本机网络能否访问 `github.com:443`
