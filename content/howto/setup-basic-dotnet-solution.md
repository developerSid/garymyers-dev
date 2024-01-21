+++
title = "How To Setup a .Net Solution Via the CLI"
date = 2024-01-20
+++


Setting up a .Net solution with multiple projects from the command line.

Before you begin make sure you've installed at least one SDK following [Installing .Net](/howto/installing-dotnet). I'm
going to be using .Net 8.0, but the flow for other releases will be the same.

## The Solution

### Some Setup
To make this more easily copy pasta'd, set an environment variable that we'll use for the solution's name. 
```shell
export SOLUTION_NAME='new-project'
```

Be sure to set `$SOLUTION_NAME` to something applicable to what you're doing.

### Create The Solution
```shell
mkdir $SOLUTION_NAME
dotnet new sln
```

You should end up with something looking like this
```shell
$ tree
.
└── new-project
    └── new-project.sln
```

## The Projects

### Core
I am a big fan of F# for many things, but first among them is for domain modeling, and share core business logic.  So the 
first project within the solution I always create is called `Core`

```shell
dotnet new 
```
