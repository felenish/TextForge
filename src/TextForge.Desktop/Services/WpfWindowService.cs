using System.Windows;
using TextForge.Core.Interfaces;

namespace TextForge.Desktop.Services;

public sealed class WpfWindowService : IWindowService
{
    public void Minimize() => Dispatch(() =>
    {
        if (GetWindow() is { } w) w.WindowState = WindowState.Minimized;
    });

    public void ToggleMaximize() => Dispatch(() =>
    {
        if (GetWindow() is not { } w) return;
        w.WindowState = w.WindowState == WindowState.Maximized
            ? WindowState.Normal
            : WindowState.Maximized;
    });

    public void RequestClose() => Dispatch(() => GetWindow()?.Close());

    private static Window? GetWindow() => Application.Current.MainWindow;

    private static void Dispatch(Action action) =>
        Application.Current.Dispatcher.Invoke(action);
}
