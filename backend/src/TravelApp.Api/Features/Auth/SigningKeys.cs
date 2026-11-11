using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace TravelApp.Api.Features.Auth;

/// <summary>
/// The ES256 key that signs our access tokens (A1). Only the API holds the private key; the public
/// part is published at /.well-known/jwks.json for PowerSync.
/// </summary>
public sealed class SigningKeys : IDisposable
{
    private readonly ECDsa _ecdsa;

    public SigningKeys(IOptions<AuthOptions> options, IHostEnvironment environment)
    {
        var pem = options.Value.SigningKeyPem;
        if (string.IsNullOrWhiteSpace(pem))
        {
            if (!environment.IsDevelopment())
            {
                throw new InvalidOperationException("Auth:SigningKeyPem is required outside Development.");
            }

            pem = LoadOrCreateDevKey(Path.Combine(environment.ContentRootPath, options.Value.DevKeyFile));
        }

        _ecdsa = ECDsa.Create();
        _ecdsa.ImportFromPem(pem);
        var publicKey = _ecdsa.ExportSubjectPublicKeyInfo();
        var keyId = Base64UrlEncoder.Encode(SHA256.HashData(publicKey)[..12]);
        Key = new ECDsaSecurityKey(_ecdsa) { KeyId = keyId };
        Credentials = new SigningCredentials(Key, SecurityAlgorithms.EcdsaSha256);
    }

    public ECDsaSecurityKey Key { get; }

    public SigningCredentials Credentials { get; }

    /// <summary>Public key only, as a JSON Web Key.</summary>
    public JwkDto PublicJwk()
    {
        var p = _ecdsa.ExportParameters(includePrivateParameters: false);
        return new JwkDto("EC", "P-256", Base64UrlEncoder.Encode(p.Q.X), Base64UrlEncoder.Encode(p.Q.Y), Key.KeyId, SecurityAlgorithms.EcdsaSha256, "sig");
    }

    /// <summary>Creates a new P-256 private key in PEM format.</summary>
    public static string NewKeyPem()
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        return key.ExportPkcs8PrivateKeyPem();
    }

    private static string LoadOrCreateDevKey(string path)
    {
        if (File.Exists(path))
        {
            return File.ReadAllText(path);
        }

        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var pem = NewKeyPem();
        File.WriteAllText(path, pem);
        return pem;
    }

    public void Dispose() => _ecdsa.Dispose();
}
