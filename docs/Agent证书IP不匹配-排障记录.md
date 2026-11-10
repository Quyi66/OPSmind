# Agent 证书 IP 不匹配排障记录

日期：2026-11-10。状态：已按以下步骤修复，用户验证通过。

## 问题与根因

Windows Agent 无法注册，日志报错：

```text
CERTIFICATE_VERIFY_FAILED
IP address mismatch, certificate is not valid for '10.94.192.81'
```

Agent 访问 `https://10.94.192.81/sjxy-console`，但原部署配置为 `SSL_DOMAINS=192.168.1.81,localhost`，生成的证书未覆盖 `10.94.192.81`。根因是访问地址与证书 SAN 不匹配，不是前端页面或注册接口故障。

## 已验证的解决办法（适用于当前测试环境）

1. 修改实际使用的 `docker-compose.yml`：

   ```yaml
   services:
     opsmind-web:
       environment:
         - SSL_DOMAINS=192.168.1.81,10.94.192.81,localhost
   ```

   以上仅展示修改项，其余配置保留。

2. 在部署目录更新前端容器：

   ```bash
   docker compose up -d --no-deps opsmind-web
   ```

   环境变量变化后，Compose 会重建容器，入口脚本会重新生成自签证书。若原部署使用额外 `-f` 参数，本次也使用相同参数；仅 `docker restart` 不会更新环境变量。

3. 检查容器内的新证书：

   ```bash
   docker exec sjxy-web openssl x509 \
     -in /etc/nginx/ssl/server.crt \
     -noout -dates -ext subjectAltName -checkip 10.94.192.81
   ```

   应包含 `IP Address:10.94.192.81`，并显示 `IP 10.94.192.81 does match certificate`。本次新证书有效期至 2027-11-10。

4. 导出新公开证书：

   ```bash
   docker cp sjxy-web:/etc/nginx/ssl/server.crt ./koreops-new.crt
   ```

   将文件传到已安装 Agent 的 Windows 机器。备份原 `C:\ProgramData\KoreOPS\ca-bundle.crt` 后，用新证书替换，文件名仍为 `ca-bundle.crt`，再重启 Agent 服务。此操作针对本次单张自签证书；若原 bundle 包含其他证书，应保留它们。不要分发 `server.key` 私钥。

5. 同步更新平台实际分发的 `ca-bundle.crt`，供后续安装使用。当前分发目录挂载自 `/opt/sjxy/agent-static-persist`。最后检查 Agent 注册日志和平台在线状态；仅第 3 步通过，还不能证明客户端已恢复。

