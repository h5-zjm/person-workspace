FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml ./
COPY src ./src

RUN mvn --batch-mode clean package

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/*.jar /app/app.jar

EXPOSE 8080

# Controlled api2 rollback drill: only the new image honors ROLLBACK_DRILL_API2.
ENTRYPOINT ["sh", "-c", "if [ \"${ROLLBACK_DRILL_API2:-}\" = \"true\" ]; then exec java -jar /app/app.jar --server.port=8081; else exec java -jar /app/app.jar; fi"]
