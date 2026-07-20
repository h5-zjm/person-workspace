# 股权交易中心 Java API

Spring Boot + Maven 的内存模拟后端，接口与 `.stitch/codegen-spec.json` 保持一致。

```bash
./mvnw spring-boot:run
```

服务默认运行在 `http://localhost:8080`，提供：

- `GET /api/v1/home`
- `GET /api/v1/market`
- `GET /api/v1/projects`
- `GET /api/v1/profile`
