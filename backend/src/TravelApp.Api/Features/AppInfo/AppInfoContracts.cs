namespace TravelApp.Api.Features.AppInfo;

/// <summary>Basic information about the running API.</summary>
/// <param name="Name">Working name of the app ("Travel App" until the final name is chosen).</param>
/// <param name="Version">API version.</param>
/// <param name="Environment">Development, Beta or Production.</param>
public sealed record AppInfoResponse(string Name, string Version, string Environment);
