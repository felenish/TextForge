using Microsoft.AspNetCore.Diagnostics;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Api.Services;

namespace TextForge.Api;

public static class ApiExtensions
{
    public static IServiceCollection AddApiServices(this IServiceCollection services)
    {
        services.AddControllers()
            .AddApplicationPart(typeof(ApiExtensions).Assembly);
        services.AddSingleton<IAppSettingsService, AppSettingsService>();
        services.AddSingleton<ISeriesWorkspaceService, SeriesWorkspaceService>();
        return services;
    }

    public static WebApplication UseApiExceptionHandler(this WebApplication app)
    {
        app.UseExceptionHandler(errApp =>
        {
            errApp.Run(async ctx =>
            {
                ctx.Response.StatusCode = 500;
                ctx.Response.ContentType = "application/json";

                var feature = ctx.Features.Get<IExceptionHandlerFeature>();
                if (feature?.Error is { } ex)
                {
                    var logger = ctx.RequestServices
                        .GetRequiredService<ILogger<WebApplication>>();
                    logger.LogError(ex,
                        "Unhandled exception on {Method} {Path}",
                        ctx.Request.Method, ctx.Request.Path);
                }

                var isDev = app.Environment.IsDevelopment();
                var message = isDev && feature?.Error is not null
                    ? feature.Error.Message
                    : "An unexpected error occurred.";
                await ctx.Response.WriteAsJsonAsync(new ErrorDto(message, "INTERNAL_ERROR"));
            });
        });
        return app;
    }
}
