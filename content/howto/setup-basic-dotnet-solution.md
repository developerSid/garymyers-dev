+++
title = "How To Setup a .Net Solution Via the CLI"
date = 2024-04-23
+++


I'm going to go through the steps of bootstrapping my current ideal .Net solution with multiple projects from the command line.  The four pieces of this are _Core_, _Test_, _Protocol_ and _Protocol.Ext_. 

Before you begin make sure you've installed at least one SDK following [Installing .Net](/howto/installing-dotnet). I'm
using .Net 8.0, but the flow for other releases will be the same or very similar.  Also, I'm going to do all of this from the command line since it is the most portable way and I use Linux as my daily driver.

## The Solution

### Some Setup
To make this more easily copy pasta'd, set an environment variable that we'll use for the solution's name. In this case I'm going to use `new-project` be sure to pick a real name that describes your project.
```bash
export SOLUTION_NAME='new-project'
```

Be sure to set `$SOLUTION_NAME` to something applicable to what you're doing.

### Create The Solution
Do the basic solution creation.

```bash
mkdir $SOLUTION_NAME
cd $SOLUTION_NAME
dotnet new sln
```

Also, a good idea to add some basic source code tooling configuration.  

```bash
dotnet new gitignore
dotnet new globaljson
dotnet new editorconfig
```

In this case we'll be adding the following
* .gitignore
  * Configure git to ignore .Net cruft that isn't important for getting the code base to build.
* .editorconfig
  * Configure editors that pay attention to .editorconfig files to follow the standard .Net conventions
* global.json
  * Set a required version that your code requires to build.  You will want to edit this as it'll be the exact version that the `dotnet` tool is configured for.  You'll end up with a file that looks like 
   ```json
   {
     "sdk": {
       "version": "8.0.203"
     }
   }
   ```
   Replace the `"8.0.203"` with `"8.0.*"` since I don't really track .Net releases that closely and 8.0 is good enough for what I'm usually doing. You should consider your use case  before taking this as gospel since you might have to track the patch for something specific.

With all these files created you should end up with something looking like:
```bash
$ tree -a
.
└── new-project
    ├── .editorconfig
    ├── .gitignore
    ├── global.json
    └── new-project.sln
```

This would be a good time to initialize git and add those basic files to a repo.

### Add a Tool Manifest
Later on we'll be setting up several tools to help with different workflows.  To do that we need to set up a tool manifest.

```bash
dotnet new tool-manifest
```

This will add _.config/dotnet-tools.json_, be sure to add that to your git repo.

### Add Helper Directories and Making Them Accessible
For pretty much any software project you will eventually need a place to store scripts or other assets to make your code base usable and maintainable over what should be a long life.  I don't like to clutter up the root of the source tree with random scripts that aren't required by the .Net tooling or even the final build process.

#### bin
First create the _.local/bin_ directory where we will drop scripts that we want available no matter where we are in the code base.  Think things like a script that generates a file based on a template or creates dummy data for development testing.  As far as this post goes this directory is required because we'll be using it later.

```bash
mkdir -p .local/bin
```

#### Optional etc and opt
Some optional directories I create that are used for housing configuration files for docker containers that I use to host third party services such as Postgres and Nginx.

_.local/etc_ for holding configuration

```bash
mkdir -p .local/etc
touch .local/etc/.gitkeep
```

_.local/opt_ for holding docker containers that I need to build because there isn't a perfect image that I trust in a public registry.

```bash
mkdir -p .local/opt
touch .local/opt/.gitkeep
```

#### direnv
I like using [direnv](https://direnv.net/) to alter the path of my shell as I navigate my file system.  Once installed and setup it allows me to add a file called .envrc to a directory that contains instructions on changes to a shell to apply when you enter a directory.  This post won't be about setting up `direnv`, but it's easy and the linked page has installation instructions.

```bash
cat > .envrc <<EOF
PATH_add .local/bin/
EOF
```

This will add the _.local/bin_ directory to your shell's search path allowing you to execute scripts in that directory without having to reference the full path.

If you create all the directories as well as the direnv config file you should end up with a structure that looks like this

```bash
$ tree -a
.
└── new-project
    ├── .editorconfig
    ├── .envrc
    ├── .gitignore
    ├── global.json
    ├── new-project.sln
    └── .local
        ├── bin
        ├── etc
        │   └── .gitkeep
        └── opt
            └── .gitkeep
```

## The Projects
I prefer to organize my project as a collection of assemblies rather than having a single assembly so everything gets its own directory and has a defined dependency on other parts of the solution as needed.

### Core
I am a big fan of F# for all the things, but chief among them is for domain modeling.  So the first project within the solution I always create is a library called `Core` where all of my domain models live as well as various utility functions that are used throughout the code base.

```bash
dotnet new classlib -o Core -n Core --language=f#
```

* **--language=f#**: sets the language to F#
* **-o Core**: sets the output directory to Core
* **-n Core**: sets the name of the project to Core

Add `Core` to the solution.

```bash
dotnet sln add Core
```

### Test
You should always have tests for your project so the next thing is to create a `Test` assembly and link it to Core.  I prefer nunit as it seems a little more cutting edge than mstest.

Create the `Test` project, add it to the solution and link in `Core`.
```bash
dotnet new nunit --name Test --output Test  --language=f#
dotnet sln add Test
dotnet add Test reference Core
```

## Package Management
I prefer a tool called [Paket](https://fsprojects.github.io/Paket/) over the built-in Nuget package management.  This is a choice that is purely optional, but I prefer the paket dependency management experience.  The entire solution's dependencies are stored in a file in the root of the source repository as a simple plaintext file.  Additionally, it offers up the ability of pulling in external files that aren't available from Nuget such as css libraries.  This gives you the freedom to store as few 3rd party assets as possible in your source tree.

### Setup
We added the tool manifest above allowing us to skip that step from the Paket [Getting Started](https://fsprojects.github.io/Paket/get-started.html) docs.  Instead, we can jump straight to adding paket and switching dependency management over to it.

```bash
dotnet tool install paket
dotnet tool restore
```

With paket now available to we can initialize it with:

```bash
dotnet paket init
```

That command should convert everything over to paket, which means we can now use it to manage dependencies.  With that done we now need to go add some standard tools to _Core_.  Change directory to the Core and start installing.

```bash
dotnet paket add FSharp.Core
dotnet paket add FsToolkit.ErrorHandling
dotnet paket add FSharpx.Collections
dotnet paket add FSharpx.Extras
dotnet paket add FsToolkit.ErrorHandling.TaskResult
dotnet paket add FSharpPlus
dotnet paket add Microsoft.Extensions.Primitives
dotnet paket add KsuidDotNet
```

* **FSharp.Core**: Paket complains if I don't have this, even though I believe this is implied by the use of F#
* **FsTookit.ErrorHandling**: Adds additional functions that help with building pipelines and error handling
* **FSharpx.Collections**: More collections that are useful in difference scenarios as well as additonal helper functions for existing collections
* **FSharpx.Extras**: More helper and extension functions.  I use this for the `string` functions more than anything.
* **FsToolkit.ErrorHandling.TaskResult**: Adds some helpers for dealing with Tasks and Results
* **Microsoft.Extensions.Primitives**: Has some helper functions when dealing with primitive types such as int's.
* **KsuidDotNet**: I prefer to use [KSUID's](https://github.com/segmentio/ksuid) for identifiers because they have 122 bits of entropy, are sortable lexicographically with the result being in generation order.

#### Shell Script
When you search for packages on Nuget they for whatever reason don't have the `dotnet` command in-front of paket like they do for `nuget`.  To avoid the inevitable case where I will copy the command exactly as it appears on the packages page I create a shell script called `paket` and put it in the _.local/bin_ directory.

```bash
cat > .local/bin/paket <<EOF
#!/usr/bin/env bash

dotnet paket "\$@"
EOF
chmod u+x .local/bin/paket
```

### Protocol Buffers
Protocol buffers are a great tool for use when communicating between separate processes.  I do however run into build order issues when I want to add some extension methods to Protobuf classes or generated classes based on my protocol definition.  My workaround is to create a classlib that holds just the protocol definition and the generated classes.  Then I create a second classlib that holds the extension methods and helper functions that depends on the first classlib.

#### Dependencies
From the root of the source tree run:

```bash
dotnet new classlib -o Protocol -n Protocol --language=C#
dotnet sln add Protocol
dotnet new classlib -o Protocol.Ext -n Protocl.Ext --language=C#
dotnet sln add Protocol.Ext
dotnet add Protocol.Ext reference Protocol
dotnet add Core reference Protocol.Ext
```

The result of all of that is that now there will be a dependency chain of `Protocol <- Protocol.Ext <- Core`. Using _Protocol.Ext_ as the relationship bridge means that when it's time to depend on _Protocol_ it can't be done directly, and instead has to be done as a reference to Protocol.Ext.  Usually though the reference will be through _Core_ which is something that most or all projects in the solution will need anyway.

Using Protobufs means we need some additional dependencies in the _Protocol_ project before it can be used as well as some msbuild configurations.  Change directory to the _Protocol_ project and add some additional dependencies.

```bash
dotnet paket add Grpc.Tools
dotnet paket add Google.Protobuf
```

#### Generate and Compile Protocol Definitions
Still within the _Protocol_ directory we need to tell msbuild that it needs to generate code from the protocol definition.  The Grpc.Tools package has this tooling available so we just need to add the instructions on how to use it.

The existing _Protocol.csproj_ file should look something like
```xml
<?xml version="1.0" encoding="utf-8"?>
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <Import Project="..\.paket\Paket.Restore.targets" />
</Project>
```

With that as our base we need to add two `ItemGroup` tags.

```xml
  <ItemGroup>
    <Protobuf Include="Protos\*.proto"> <!-- I put my proto files in the Protos directory and I want to include all .proto files -->
      <GrpcServices>None</GrpcServices> <!-- The Protocol definitions here are for message passing and storage, so we don't need to generate any Service endpoints -->
      <Access>Public</Access> <!--  Make the classes public -->
      <ProtoCompile>True</ProtoCompile>
      <ProtoRoot>Protos</ProtoRoot>
      <CompileOutputs>False</CompileOutputs> <!-- This has to be false or the compiler does stupid things -->
      <OutputDir>Generated/</OutputDir> <!-- Put the generated C# code in a directory called Generated -->>
      <Generator>MSBuild:Compile</Generator>
    </Protobuf>
  </ItemGroup>
  <ItemGroup>
    <Folder Include="Generated\" />
  </ItemGroup>
```

I design as much of my software as I can around [event sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) which I implement through a protocol that has a root called EventLog.  This is defined in a file at _Protocol/Protos/EventLog.proto_ with the basics being

```text
syntax = "proto3";

option optimize_for = SPEED;

package sign.here.please.protocol;

// import "google/protobuf/wrappers.proto"; // use wrappers from this import for numeric values that need to be nullable
// https://learn.microsoft.com/en-us/dotnet/architecture/grpc-for-wcf-developers/protobuf-data-typesc

import "google/protobuf/empty.proto";
import "google/protobuf/timestamp.proto";

message ProtocolKsuid {
  string value = 1;
}

message ProtocolEventLog {
  ProtocolKsuid entityId = 1;
  ProtocolMyEvent data = 2;
}

message ProtocolMyEvent {
  oneof event {
    ProtocolDomainRootOneEvents domainRootOneEvents = 1;
    ProtocolDomainRootTwoEvents domainRootTwoEvents = 2;
  };
}

message ProtocolDomainRootOneEvents {
  oneof event {
    string domainRootOneEventOne = 1;
    string domainRootOneEventTwo = 2;
  }
}

message ProtocolDomainRootTwoEvents {
  oneof event {
    string domainRootTwoEventOne = 1;
    string domainRootTwoEventTwo = 2;
  }
}
```

Finally add to your _.gitignore_ a line to ignore the generated code.

```bash
echo Protocol/Generated >> .gitignore
```

### Code Formatting
Consistent code formatting is something we should always have.  This avoids [bikeshedding](https://en.wiktionary.org/wiki/bikeshedding), lowers the need to decipher someone else's coding style and removes the need to remember to have your editor format the code if you go outside the prescribed style. 

#### F# Code Formatting
[Fantomas](https://fsprojects.github.io/fantomas/) is the only game in town when it comes to formatting F#.  In the root of the source tree run:

```bash
dotnet tool install fantomas
```

Once installed Fantomas will use the _.editorconfig_ at the root of the source tree to format F# code in the solution.  I usually add a format shell script in .local/bin so that I can invoke the formatter from the cli whenever I want to.

```bash
cat > .local/bin/format <<EOF
#!/usr/bin/env sh

set -e

cd "\${0%/*}" # set a consistent directory to be the location of this script
cd ../..

echo "Formatting F# files..."
find . -type f \( -name '*.fs' -o -name '*.fsx' \) -not -path '*obj*' -not -path './packages/**' | xargs dotnet fantomas

EOF
chmod u+x .local/bin/format
```

That script combined with the `direnv` setup will allow us to execute the `format` command from anywhere in the source tree.

#### C# Code Formatting
[CSharpier][https://csharpier.com/] is the code formatting tool I use.  I haven't really bothered to look for any others since it does what I want.  Like Fantomas it needs to be installed as a tool, so from the root of the source tree run:

```bash
dotnet tool install csharpier
```

Once installed CSharpier like Fantomas will use the _.editorconfig_ file in the root of the source tree to apply formatting rules to the C# code in our solution.  Added a couple of lines to our format script from the Fantomas section so that a single command will format everything.

```bash
cat >> .local/bin/format <<EOF
echo "Formatting C# files..."
find . -type f -name '*.cs' -not -path '*obj*' | xargs dotnet csharpier

EOF
```

### Commit Hooks
CSharpier has documentation for setting up [Husky.Net](https://github.com/alirezanet/husky.net) and as a general tool it works pretty well.  I usually set it up to format the C# and F# code as well as running the compiler to make sure the code compiles before it is committed.  Those actions can be setup by creating or editing the _.husky/task-runner.json_ file with the following: 

``` bash
mkdir -p .husky
cat > .husky/task-runner.json <<EOF
{
  "tasks": [
    {
      "name": "Run csharpier",
      "command": "dotnet",
      "args": [ "csharpier", "${staged}" ],
      "include": [ "**/*.cs" ]
    },
    {
      "name": "Run fantomas",
      "command": "dotnet",
      "args": [ "fantomas", "${staged}" ],
      "include": [ "**/*.fs", "**/*.fsx" ]
    },
    {
      "name": "build-check",
      "command": "dotnet",
      "group": "pre-push",
      "args": ["build", "/warnaserror", "--no-restore", "--verbosity", "quiet"]
    }
  ]
}

EOF
```

Then install Husky with:

```bash
dotnet tool install husky
dotnet husky install
```

If you get the message **Git hooks installation failed**, then you will need to run `git init` in the root of the source tree and run the `dotnet husky install` again.

### Other Configurations

#### F# Projects
In each F# project there is going to be a file that has an extension of .fsproj.  Within that file several XML elements can be added to customize the project behavior beyond the defaults.  The basic `.fsproj` file for a classlib project will look something like this with .net 8

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
  </PropertyGroup>

  <ItemGroup>
    <Compile Include="Library.fs" />
  </ItemGroup>

</Project>
```

To the Project/PropertyGroup add
* `<LangVersion>8</LangVersion>` 
  * [LangVersion](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/)
  * Specifiy the Language version explicitly is always a good idea in every language if it can be.
* `<WarningsAsErrors>FS0025</WarningsAsErrors>` 
  * [WarningsAsErrors](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/errors-warnings#warningsaserrors-and-warningsnotaserrors)
  * This forces the compiler to generate an error when doing pattern matching which is helpful as elements to a discriminated union are added the compiler will let you know where you need to go update your code.
* `<RootNameSpace>Dev.GaryMyers.Core</RootNamespace>` 
  * When a file is created this value will be used as part of the namespace.  I'm a Java developer mostly and I do like not having to deal with collisions by using the domain name I own for my namespaces.  This can be whatever you want though.
* `<NoWarn>FS0104</NoWarn>` 
  * [NoWarn](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/errors-warnings#nowarn)
  * Since I'm using Protobuf I will set this to avoid noise from not handling Protobuf enumerations for the message type.  Otherwise, you have to add the `_ ->` pattern everywhere.

#### C# Projects
In each C# project there is going to be a file that has an extnsion of .csproj.  Within that file there are two elements I always add to the default file.

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <RootNameSpace>Dev.GaryMyers.Example</RootNamespace> <!-- Setup a root namespace so as files are created they get this as their base namesspace -->
    <LangVersion>12</LangVersion> <!-- Set the language version explicitly -->
  </PropertyGroup>
  <Import Project="..\.paket\Paket.Restore.targets" />
</Project>
```

#### Core Project
The Core project being the primary part of the solution is where to place a configuration that will do the installation of our tools. Add the following XML snippet in the Core.fsproj file between the `<project></project>` tags:

```xml
  <Target Name="Husky" BeforeTargets="Restore;CollectPackageReferences" Condition="'$(HUSKY)' != 0">
    <Exec Command="dotnet tool restore" StandardOutputImportance="Low" StandardErrorImportance="High" />
    <Exec Command="dotnet husky install" StandardOutputImportance="Low" StandardErrorImportance="High" WorkingDirectory=".." />
  </Target>
```

I borrowed this from Husky's installation instructions which is why it has the word husky in it.
