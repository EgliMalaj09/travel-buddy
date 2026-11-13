# The API as a container image (KAN-61). Built by .github/workflows/deploy-beta.yml and pushed to GitHub's free
# container registry; Azure Container Apps runs it. Build by hand from backend/:  docker build -t travel-app-api .
# No settings or secrets are baked in: they come from the hosting platform's environment settings.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json Directory.Build.props Directory.Packages.props ./
COPY src/TravelApp.Api/TravelApp.Api.csproj src/TravelApp.Api/
RUN dotnet restore src/TravelApp.Api/TravelApp.Api.csproj
COPY src/ src/
# The OpenAPI file is made in development and CI, not inside the image.
RUN dotnet publish src/TravelApp.Api/TravelApp.Api.csproj -c Release -o /app --no-restore \
    -p:OpenApiGenerateDocuments=false -p:UseAppHost=false

# Runtime only, no shell tools, runs as a non-root user ("app", built into the .NET images).
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app ./
USER app
ENV ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_ENVIRONMENT=Beta \
    DOTNET_gcServer=0
EXPOSE 8080
ENTRYPOINT ["dotnet", "TravelApp.Api.dll"]
