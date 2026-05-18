namespace TextForge.Api;

public static class ApiExtensions
{
    public static IMvcBuilder AddApiControllers(this IServiceCollection services)
        => services.AddControllers()
            .AddApplicationPart(typeof(ApiExtensions).Assembly);
}
