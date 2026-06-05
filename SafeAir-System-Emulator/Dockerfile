# Multi-stage build optimizado para caché Maven
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copiar primero pom.xml para caché de dependencias
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copiar fuentes y compilar (solo si pom.xml no cambió)
COPY src ./src

# Build optimizado: skip tests, checkstyle, spotbugs
RUN mvn clean package \
    -DskipTests \
    -Dcheckstyle.skip=true \
    -Dspotbugs.skip=true \
    -Dmaven.test.skip=true \
    -Dmaven.javadoc.skip=true \
    -Dmaven.source.skip=true

# Stage final: imagen mínima
FROM eclipse-temurin:17-jre
WORKDIR /app

# Crear usuário no-root para seguridad
RUN groupadd -r safeair && useradd -r -g safeair safeair

COPY --from=build /app/target/*.jar app.jar
RUN chown -R safeair:safeair /app

USER safeair
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
