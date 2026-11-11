using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace TravelApp.Api.Features.Auth;

/// <summary>
/// Adds "Bearer" to the OpenAPI document, and marks every endpoint that needs a token,
/// so Postman and the Scalar page can send the access token.
/// </summary>
public static class AuthOpenApi
{
    private const string Scheme = "Bearer";

    public static OpenApiOptions AddBearerAuth(this OpenApiOptions options)
    {
        options.AddDocumentTransformer((document, _, _) =>
        {
            document.Components ??= new OpenApiComponents();
            document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
            document.Components.SecuritySchemes[Scheme] = new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "Access token from /auth/signup/verify, /auth/login, /auth/login/verify, /auth/google, /auth/apple or /auth/refresh.",
            };
            return Task.CompletedTask;
        });
        options.AddOperationTransformer((operation, context, _) =>
        {
            var metadata = context.Description.ActionDescriptor.EndpointMetadata;
            if (metadata.OfType<IAllowAnonymous>().Any())
            {
                return Task.CompletedTask;
            }

            operation.Security ??= [];
            operation.Security.Add(new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference(Scheme, context.Document)] = [],
            });
            return Task.CompletedTask;
        });
        return options;
    }
}
