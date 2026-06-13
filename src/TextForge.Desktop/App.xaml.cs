using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Windows;
using System.Windows.Threading;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using TextForge.Api;
using TextForge.Core.Interfaces;
using TextForge.Core.Manifests;
using TextForge.Core.Manifests.Migrations;
using TextForge.Desktop.Services;
using TextForge.Export.Interfaces;
using TextForge.Export.Services;
using TextForge.Modules;
using TextForge.Storage.Services;
using TextForge.Versioning.Interfaces;
using TextForge.Versioning.Services;

namespace TextForge.Desktop;

public partial class App : Application
{
    private WebApplication? _api;
    private int _port;

    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var logDir = ConfigureSerilog();

        Log.Information("TextForge Studio starting — version {Version}",
            UpdateService.CurrentVersion);
        Log.Information("Log directory: {LogDirectory}", logDir);

        DispatcherUnhandledException += OnDispatcherUnhandledException;
        AppDomain.CurrentDomain.UnhandledException += OnDomainUnhandledException;

        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

        _port = GetAvailablePort();
        _api = BuildApi(_port);
        await _api.StartAsync();

        Log.Information("API listening on port {Port}", _port);

        new MainWindow(_port).Show();
    }

    protected override async void OnExit(ExitEventArgs e)
    {
        Log.Information("TextForge Studio shutting down");
        if (_api is not null)
            await _api.StopAsync();
        await Log.CloseAndFlushAsync();
        base.OnExit(e);
    }

    private static string ConfigureSerilog()
    {
        static string ResolveLogDirectory()
        {
            var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var preferred = Path.Combine(localAppData, "TextForge", "logs");

            try
            {
                Directory.CreateDirectory(preferred);
                return preferred;
            }
            catch
            {
                var fallback = Path.Combine(Path.GetTempPath(), "TextForge", "logs");
                Directory.CreateDirectory(fallback);
                return fallback;
            }
        }

        var logDir = ResolveLogDirectory();

        Serilog.Debugging.SelfLog.Enable(msg =>
        {
            try
            {
                var selfLogPath = Path.Combine(logDir, "serilog-selflog.txt");
                File.AppendAllText(selfLogPath, msg + Environment.NewLine);
            }
            catch
            {
                // Never throw from self-log sink.
            }
        });

        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Information()
            .Enrich.FromLogContext()
            .WriteTo.File(
                path: Path.Combine(logDir, "app-.log"),
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 30,
                shared: true,
                flushToDiskInterval: TimeSpan.FromSeconds(1),
                outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
#if DEBUG
            .WriteTo.Debug()
#endif
            .CreateLogger();

        return logDir;
    }

    private static int GetAvailablePort()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }

    private static WebApplication BuildApi(int port)
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls($"http://localhost:{port}");
        builder.WebHost.UseContentRoot(AppContext.BaseDirectory);

        // Route all Microsoft.Extensions.Logging output through Serilog.
        builder.Host.UseSerilog();

        builder.Services.AddApiServices();

        // Manifest migration chain
        builder.Services.AddSingleton<IBookManifestMigration, AddModulesKeyMigration>();
        builder.Services.AddSingleton<BookManifestMigrator>();

        // Module system
        builder.Services.AddSingleton<ModuleRegistry>();
        builder.Services.AddSingleton<ModuleStorageService>();

        builder.Services.AddSingleton<IBookStorageService, BookStorageService>();
        builder.Services.AddSingleton<ISeriesStorageService, SeriesStorageService>();
        builder.Services.AddSingleton<ICharacterStorageService, CharacterStorageService>();
        builder.Services.AddSingleton<ILocationStorageService, LocationStorageService>();
        builder.Services.AddSingleton<IOutlineStorageService, OutlineStorageService>();
        builder.Services.AddSingleton<IPlotGridStorageService, PlotGridStorageService>();
        builder.Services.AddSingleton<IVersioningService, VersioningService>();
        builder.Services.AddSingleton<IExportService, ExportService>();
        builder.Services.AddSingleton<IShellDialogService, WpfShellDialogService>();
        builder.Services.AddSingleton<IWindowService, WpfWindowService>();

        var app = builder.Build();

        // Discover modules from the built-in, bundled-external, and user module directories
        var registry = app.Services.GetRequiredService<ModuleRegistry>();
        var modulesRoot = Path.Combine(AppContext.BaseDirectory, "modules");
        var builtInModulesPath = Path.Combine(modulesRoot, "builtin");
        var bundledExternalPath = Path.Combine(modulesRoot, "external");
        var userModulesPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "TextForge", "modules");
        registry.Discover(builtInModulesPath);
        registry.Discover(bundledExternalPath);
        registry.Discover(userModulesPath);
        app.UseApiExceptionHandler();
        app.UseDefaultFiles();
#if DEBUG
        app.UseStaticFiles(new StaticFileOptions
        {
            OnPrepareResponse = ctx =>
            {
                ctx.Context.Response.Headers["Cache-Control"] = "no-store";
                ctx.Context.Response.Headers["Pragma"] = "no-cache";
            },
        });
#else
        app.UseStaticFiles();
#endif
        app.MapControllers();
        app.MapFallbackToFile("index.html");
        return app;
    }

    private void OnDispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        Log.Fatal(e.Exception, "Unhandled WPF dispatcher exception");
        Log.CloseAndFlush();
        MessageBox.Show(
            $"An unexpected error occurred:\n{e.Exception.Message}",
            "TextForge Studio",
            MessageBoxButton.OK,
            MessageBoxImage.Error);
        e.Handled = true;
    }

    private static void OnDomainUnhandledException(object sender, UnhandledExceptionEventArgs e)
    {
        if (e.ExceptionObject is Exception ex)
            Log.Fatal(ex, "Unhandled AppDomain exception (terminating={IsTerminating})", e.IsTerminating);
        else
            Log.Fatal("Unhandled AppDomain exception (non-Exception object)");
        Log.CloseAndFlush();
    }
}
