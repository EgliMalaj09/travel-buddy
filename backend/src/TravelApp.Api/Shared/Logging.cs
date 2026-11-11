namespace TravelApp.Api.Shared;

/// <summary>Readable logs on the laptop, structured JSON logs in beta and production.</summary>
public static class Logging
{
    public static WebApplicationBuilder AddTravelAppLogging(this WebApplicationBuilder builder)
    {
        if (!builder.Environment.IsDevelopment())
        {
            builder.Logging.ClearProviders();
            builder.Logging.AddJsonConsole();
        }

        return builder;
    }
}
