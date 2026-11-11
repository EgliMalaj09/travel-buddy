using Scalar.AspNetCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.AppInfo;
using TravelApp.Api.Features.Health;
using TravelApp.Api.Features.Trips;
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
}));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddTravelAppDatabase(builder.Configuration);
builder.Services.AddHealthFeature();
builder.Services.AddTripsFeature();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    // API documents and the Scalar page exist in development only (decisions/tech-stack.md).
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapHealthEndpoints();
app.MapAppInfoEndpoints();

app.Run();

// Lets the test project start the API with WebApplicationFactory<Program>.
public partial class Program;
