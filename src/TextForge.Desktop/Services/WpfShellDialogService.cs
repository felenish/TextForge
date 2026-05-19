using System.Diagnostics;
using System.Windows;
using Microsoft.Win32;
using TextForge.Core.Interfaces;

namespace TextForge.Desktop.Services;

public sealed class WpfShellDialogService : IShellDialogService
{
    public Task<string?> ShowOpenFileDialogAsync(string title, string filter)
        => Application.Current.Dispatcher.InvokeAsync(() =>
        {
            var dlg = new OpenFileDialog { Title = title, Filter = filter };
            return dlg.ShowDialog() == true ? dlg.FileName : null;
        }).Task;

    public Task<string?> ShowSaveFileDialogAsync(string title, string filter, string defaultFileName)
        => Application.Current.Dispatcher.InvokeAsync(() =>
        {
            var dlg = new SaveFileDialog { Title = title, Filter = filter, FileName = defaultFileName };
            return dlg.ShowDialog() == true ? dlg.FileName : null;
        }).Task;

    public Task<string?> ShowFolderDialogAsync(string title)
        => Application.Current.Dispatcher.InvokeAsync(() =>
        {
            var dlg = new OpenFolderDialog { Title = title };
            return dlg.ShowDialog() == true ? dlg.FolderName : null;
        }).Task;

    public Task RevealPathAsync(string absolutePath)
    {
        Process.Start("explorer.exe", $"/select,\"{absolutePath}\"");
        return Task.CompletedTask;
    }
}
