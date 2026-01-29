# Installing Judge0 on Ubuntu Server Guide

This guide walks you through installing **Judge0 v1.13.1** on an Ubuntu Server in a way that actually works in practice.

It includes the **most common pitfall** people hit (cgroup v2) and explains _why_ certain steps are needed, not just what to type. If you follow this from top to bottom, you’ll end up with a fully working Judge0 instance running in Docker.

---

## What Is Judge0 and How It Works

**Judge0** is an open‑source online code execution system (also called an _online judge_). It is commonly used in:

- Coding platforms
- Technical interviews
- Online IDEs
- Learning platforms
- Competitive programming systems

### How Judge0 Executes Code Securely

Judge0 does **not** execute user code directly on the host system. Instead, it uses a layered security model:

1. **Docker** is used to isolate Judge0 services, while each code submission is executed inside a lightweight Isolate sandbox that enforces strict CPU, memory, and file system limits.

2. **Isolate sandbox** – a low-level Linux sandbox that enforces:
   - CPU time limits
   - Memory limits
   - Process limits
   - File system restrictions
3. **cgroups (v1)** – used to strictly control resource usage and prevent abuse

This combination ensures that untrusted code cannot:

- Access the host system
- Read or modify files outside its sandbox
- Exhaust system resources
- Interfere with other executions

That is why correct **cgroup configuration** is critical for Judge0 to work properly.

### Supported Languages

Judge0 supports **70+ programming languages** and multiple versions of each, including (but not limited to):

- C / C++
- Java
- Python
- JavaScript (Node.js)
- TypeScript
- Go
- Rust
- PHP
- Ruby
- C#
- Kotlin
- Swift
- Bash

You can list all supported languages and their IDs at any time using:

```bash
curl http://localhost:2358/languages
```

Each language is compiled and executed using its official toolchain inside the sandbox.

---

## What You’ll Need

Before starting, make sure you have:

- Ubuntu Server **20.04, 22.04, or 24.04**
- Root access or a user with `sudo`
- At least **2 GB RAM** (4 GB strongly recommended)
- **20 GB free disk space** minimum
- A reboot window (required for kernel changes)

---

## Step 1 – Fix the Kernel (This Is Important)

If Judge0 containers keep restarting or crash instantly, this step is usually the reason.

Recent Ubuntu versions use **cgroup v2** by default, but Judge0’s sandboxing tool (**Isolate**) still relies on **cgroup v1**. So we must explicitly disable cgroup v2.

### 1.1 Edit GRUB

```bash
sudo nano /etc/default/grub
```

Find this line:

```text
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"
```

Update it to:

```text
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash systemd.unified_cgroup_hierarchy=0"
```

Save and exit (`Ctrl + X`, then `Y`, then `Enter`).

### 1.2 Apply and Reboot

```bash
sudo update-grub
sudo reboot
```

### 1.3 Verify After Reboot

Once the system is back up:

```bash
stat -fc %T /sys/fs/cgroup/
```

Expected result:

```text
tmpfs
```

If you see `cgroup2fs`, Judge0 **will not work correctly** — go back and recheck the GRUB step.

---

## Step 2 – Install Required Software

### 2.1 Update the System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Install Docker

```bash
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
```

Check that Docker is working:

```bash
docker --version
```

### 2.3 Install Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

Verify installation:

```bash
docker-compose --version
```

### 2.4 (Optional) Run Docker Without sudo

If you don’t want to type `sudo` every time:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

---

## Step 3 – Deploy Judge0

### 3.1 Create a Working Directory

```bash
mkdir -p ~/judge0-deployment
cd ~/judge0-deployment
```

### 3.2 Create docker-compose.yml

```bash
nano docker-compose.yml
```

Paste the following:

```yaml
services:
  server:
    image: judge0/judge0:1.13.1
    ports:
      - '2358:2358'
    privileged: true
    restart: always
    environment:
      - REDIS_HOST=redis
      - POSTGRES_HOST=db
      - POSTGRES_DB=judge0
      - POSTGRES_USER=judge0
      - POSTGRES_PASSWORD=judge0
      - ENABLE_WAIT_RESULT=true
    volumes:
      - judge0-data:/srv/judge0
    shm_size: '2gb'
    depends_on:
      - db
      - redis

  worker:
    image: judge0/judge0:1.13.1
    command: ['./scripts/workers']
    privileged: true
    restart: always
    environment:
      - REDIS_HOST=redis
      - POSTGRES_HOST=db
      - POSTGRES_DB=judge0
      - POSTGRES_USER=judge0
      - POSTGRES_PASSWORD=judge0
    volumes:
      - judge0-data:/srv/judge0
    shm_size: '2gb'
    depends_on:
      - db
      - redis

  db:
    image: postgres:13
    restart: always
    environment:
      POSTGRES_DB: judge0
      POSTGRES_USER: judge0
      POSTGRES_PASSWORD: judge0
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:6
    restart: always

volumes:
  judge0-data:
  postgres-data:
```

Save and exit.

### 3.3 Start Everything

```bash
docker-compose up -d
```

Check status:

```bash
docker-compose ps
```

All services should show **Up**.

---

## Step 4 – Test That It Actually Works

### 4.1 Python Test

```bash
curl -X POST "http://localhost:2358/submissions?wait=true" \
  -H "Content-Type: application/json" \
  -d '{"source_code":"print(\"Judge0 is working!\")","language_id":71}'
```

Expected output includes:

```json
"description": "Accepted"
```

### 4.2 C++ Test

```bash
curl -X POST "http://localhost:2358/submissions?wait=true" \
  -H "Content-Type: application/json" \
  -d '{"source_code":"#include <iostream>\nint main(){std::cout<<\"C++ OK\";}","language_id":54}'
```

### 4.3 Java Test

```bash
curl -X POST "http://localhost:2358/submissions?wait=true" \
  -H "Content-Type: application/json" \
  -d '{"source_code":"public class Main{public static void main(String[]a){System.out.println(\"Java OK\");}}","language_id":62}'
```

---

## Common Problems & Fixes

### Containers Restarting in a Loop

Almost always caused by **cgroup v2 still being active**.

Recheck:

```bash
stat -fc %T /sys/fs/cgroup/
```

### Cannot Reach Port 2358

```bash
sudo ufw allow 2358/tcp
sudo ufw reload
```

### Database Errors on First Start

This is normal sometimes.

```bash
docker-compose down
docker-compose up -d
```

Wait ~30 seconds and retry.

### Out‑of‑Memory Errors

- Ensure at least **2–4 GB RAM**
- `shm_size` is already set to `2gb`

---

## Useful Commands

```bash
# Stop everything
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f

# Update images
docker-compose pull
docker-compose up -d

# Full reset (dangerous)
docker-compose down -v
```

---
