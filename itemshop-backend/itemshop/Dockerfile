# ── Stage 1: Build ──────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

COPY gradlew gradlew.bat ./
COPY gradle ./gradle
RUN chmod +x gradlew

# Cache dependencies osobno (warstwa nie zmienia się przy zmianie kodu)
COPY build.gradle settings.gradle ./
RUN ./gradlew dependencies --no-daemon -q 2>/dev/null || true

COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test -q

# ── Stage 2: Runtime (tylko JRE + JAR, zero kodu źródłowego) ────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S itemshop && adduser -S itemshop -G itemshop
USER itemshop

COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
