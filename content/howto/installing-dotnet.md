+++
title = "Installing .Net on Linux"
date = 2024-01-20
+++

Installing the basics of .Net tooling on Linux (and possibly on MacOS too).

[Microsoft Instructions](https://learn.microsoft.com/en-us/dotnet/core/install/linux-scripted-manual#scripted-install)

Assumption is that `~/.local/bin` is on your path.

```shell
mkdir -p ~/.local/bin
wget https://dot.net/v1/dotnet-install.sh -O ~/.local/bin/dotnet-install
chmod u+x ~/.local/bin/dotnet-install
```

### Installing .Net 6.0
```shell
dotnet-install -Channel 6.0
```

### Installing .Net 7.0
```shell
dotnet-install -Channel 7.0
```

### Installing .Net 8.0
```shell
dotnet-install -Channel 8.0
```

### Installing Current Long Term Support 
```shell
dotnet-install -Channel LTS
```

### Installing Current Standard Term Support
```shell
dotnet-install -Channel STS
```
