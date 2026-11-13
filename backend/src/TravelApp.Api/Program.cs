using Scalar.AspNetCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.AppInfo;
using TravelApp.Api.Features.Auth;
using TravelApp.Api.Features.Checklist;
using TravelApp.Api.Features.Health;
using TravelApp.Api.Features.Places;
using TravelApp.Api.Features.Sync;
using TravelApp.Api.Features.Trips;
using TravelApp.Api.Features.Weather;
using TravelApp.Api.Shared;

// Program.cs only wires things up (structure rule 4): services, then one Map<Feature>Endpoints() per feature.
var builder = WebApplication.CreateBuilder(args);

builder.AddTravelAppLogging();
builder.Services.AddTravelAppErrors();
builder.Services.AddValidation();
builder.Services.AddOpenApi(options => options.AddDocumentTransformer((document, _, _) =>
{
    document.Info.Title = "Travel App API";
    document.Info.Description = "API of the Travel App (working name). Source of truth for the app's generated types.";
    return Task.CompletedTask;
}).AddBearerAuth());
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddTravelAppDatabase(builder.Configuration);
builder.Services.AddHealthFeature();
builder.Services.AddAuthFeature(builder.Configuration);
builder.Services.AddTripsFeature();
builder.Services.AddPlacesFeature();
builder.Services.AddChecklistFeature();
builder.Services.AddSyncFeature();
builder.Services.AddWeatherFeature(builder.Configuration);

// The web build of the app (npm run web, http://localhost:8081) calls the API from another port,
// so the browser needs CORS. Development only: phones do not use CORS.
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
        .SetIsOriginAllowed(origin => Uri.TryCreate(origin, UriKind.Absolute, out var uri) && uri.IsLoopback)
        .AllowAnyHeader()
        .AllowAnyMethod()));
}

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
if (app.Environment.IsDevelopment()) app.UseCors();
app.UseAuthFeature();

if (app.Environment.IsDevelopment())
{
    // API documents and the Scalar page exist in development only (decisions/tech-stack.md).
    app.MapOpenApi().AllowAnonymous();
    app.MapScalarApiReference().AllowAnonymous();
}

app.MapHealthEndpoints();
app.MapAppInfoEndpoints();
app.MapAuthEndpoints();
app.MapTripsEndpoints();
app.MapPlacesEndpoints();
app.MapSyncEndpoints();
app.MapWeatherEndpoints();

app.Run();

// Lets the test project start the API with WebApplicationFactory<Program>.
public partial class Program;
