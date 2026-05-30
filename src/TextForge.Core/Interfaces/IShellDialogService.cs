namespace TextForge.Core.Interfaces;

public interface IShellDialogService
{
    /// <summary>Shows the OS open-file dialog. Returns the selected path, or <c>null</c> if cancelled.</summary>
    Task<string?> ShowOpenFileDialogAsync(string title, string filter);

    /// <summary>Shows the OS save-file dialog. Returns the chosen path, or <c>null</c> if cancelled.</summary>
    Task<string?> ShowSaveFileDialogAsync(string title, string filter, string defaultFileName);

    /// <summary>Shows the OS folder-picker dialog. Returns the selected path, or <c>null</c> if cancelled.</summary>
    Task<string?> ShowFolderDialogAsync(string title);

    /// <summary>Opens File Explorer with the given path selected.</summary>
    Task RevealPathAsync(string absolutePath);

    /// <summary>Opens File Explorer at the given folder path.</summary>
    Task OpenFolderPathAsync(string folderPath);
}
