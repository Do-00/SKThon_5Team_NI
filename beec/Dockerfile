# beec(Spring Boot) 컨테이너 — Render 등에서 `beec` 폴더를 루트로 지정해 빌드한다.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN chmod +x mvnw && ./mvnw -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# 무료 인스턴스(메모리 512MB)에서도 seed.json(15MB)을 올릴 수 있게 힙을 제한한다.
ENV JAVA_OPTS="-Xmx380m -XX:+UseSerialGC"
# PORT 는 플랫폼이 넣어 준다(application.properties 가 읽는다).
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
