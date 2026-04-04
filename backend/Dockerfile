# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17 AS builder

WORKDIR /app

# Cache dependencies first (only re-runs when pom.xml changes)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Build the fat JAR
COPY src ./src
RUN mvn package -DskipTests -B

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Create a non-root user
RUN addgroup -S inkflow && adduser -S inkflow -G inkflow

# Copy fat JAR from builder
COPY --from=builder /app/target/inkflow-backend-*.jar app.jar

# Writable directory for uploaded files
RUN mkdir -p uploads && chown -R inkflow:inkflow /app

USER inkflow

EXPOSE 8080

ENTRYPOINT ["java", "-Xmx512m", "-jar", "app.jar"]
