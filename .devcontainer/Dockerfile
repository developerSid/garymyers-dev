FROM docker.io/fedora:40

ARG DOCKER_GID=999
USER root

RUN dnf update -y &&\
    dnf remove -y docker \
    docker-client \
    docker-client-latest \
    docker-common \
    docker-latest \
    docker-latest-logrotate \
    docker-logrotate \
    docker-selinux \
    docker-engine-selinux \
    docker-engine

RUN dnf install -y neovim git dnf-plugins-core zsh curl lsd direnv bat ripgrep fzf fd-find zip unzip btop sudo
RUN groupadd -g $DOCKER_GID docker || groupmod -g $DOCKER_GID docker

RUN useradd -m -s /bin/zsh developer && \
    usermod -aG docker developer && \
    echo "developer ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

RUN dnf-3 config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo && \
    dnf copr enable -y fz0x1/zola && \
    dnf install -y docker-ce-cli docker-compose-plugin zola && \
    chown -R developer:developer /home/developer && \
    usermod -aG docker developer

USER developer

RUN RUNZSH=no sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
RUN mkdir -p ~/.local/bin && \
    curl -L https://github.com/zellij-org/zellij/releases/latest/download/zellij-x86_64-unknown-linux-musl.tar.gz \
    | tar -xz -C ~/.local/bin
RUN mkdir -p /home/developer/.config && \
    git clone https://github.com/developerSid/nvim.git /home/developer/.config/nvim && \
    git clone https://github.com/developerSid/dotfiles /home/developer/.dotfiles && \
    /home/developer/.dotfiles/install.sh && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

WORKDIR /garymyers-dev
