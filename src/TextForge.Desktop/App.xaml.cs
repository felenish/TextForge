using System.Net;
using System.Net.Sockets;
using System.Windows;
using System.Windows.Threading;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using TextForge.Api;
using TextForge.Core.Interfaces;
using TextForge.Desktop.Services;
using TextForge.Storage.Services;

namespace TextForge.Desktop;

public partial class App : Application
{
    private WebApplication? _api;
    private int _port;

    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        DispatcherUnhandledException += OnDispatcherUnhandledException;

        _port = GetAvailablePort();
        _api = BuildApi(_port);
        await _api.StartAsync();

        new MainWindow(_port).Show();
    }

    protected override async void OnExit(ExitEventArgs e)
    {
        if (_api is not null)
            await _api.StopAsync();
        base.OnExit(e);
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

        builder.Services.AddApiServices();
        builder.Services.AddSingleton<IBookStorageService, BookStorageService>();
        builder.Services.AddSingleton<ISeriesStorageService, SeriesStorageService>();
        builder.Services.AddSingleton<ICharacterStorageService, CharacterStorageService>();
        builder.Services.AddSingleton<IShellDialogService, WpfShellDialogService>();
        builder.Services.AddSingleton<IWindowService, WpfWindowService>();

        var app = builder.Build();
        app.UseApiExceptionHandler();
        app.UseDefaultFiles();
        app.UseStaticFiles();
        app.MapControllers();
        app.MapFallbackToFile("index.html");
        return app;
    }

    private void OnDispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        MessageBox.Show(
            $"An unexpected error occurred:\n{e.Exception.Message}",
            "TextForge Studio",
            MessageBoxButton.OK,
            MessageBoxImage.Error);
        e.Handled = true;
    }
}
