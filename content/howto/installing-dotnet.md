+++
title = "Installing .Net on Linux"
date = 2024-01-20
+++

Installing the basics of .Net tooling on Linux (and possibly on MacOS too).

[Microsoft Instructions](https://learn.microsoft.com/en-us/dotnet/core/install/linux-scripted-manual#scripted-install)

Assumption is that `~/.local/bin` is on your path.

```bash
mkdir -p ~/.local/bin
wget https://dot.net/v1/dotnet-install.sh -O ~/.local/bin/dotnet-install
chmod u+x ~/.local/bin/dotnet-install
```

### Installing .Net 6.0
```bash
dotnet-install -Channel 6.0
```

### Installing .Net 7.0
```bash
dotnet-install -Channel 7.0
```

### Installing .Net 8.0
```bash
dotnet-install -Channel 8.0
```

### Installing Current Long Term Support 
```bash
dotnet-install -Channel LTS
```

### Installing Current Standard Term Support
```bash
dotnet-install -Channel STS
```

Be sure to add `$HOME/.dotnet` to your `$PATH`, and if you want to opt out of telemetry while you're editing your shell's 
profile you might consider exporting a variable `export DOTNET_CLI_TELEMETRY_OPTOUT=1`
