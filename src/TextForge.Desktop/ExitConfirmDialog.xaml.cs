using System.Windows;

namespace TextForge.Desktop;

public enum ExitConfirmResult { Cancel, Discard, SaveAll }

public partial class ExitConfirmDialog : Window
{
    public ExitConfirmResult Result { get; private set; } = ExitConfirmResult.Cancel;

    public ExitConfirmDialog(int dirtyCount)
    {
        InitializeComponent();
        var noun = dirtyCount == 1 ? "scene has" : "scenes have";
        DetailText.Text = $"{dirtyCount} {noun} unsaved changes. Save before closing, discard changes, or cancel.";
    }

    private void BtnSaveAll_Click(object sender, RoutedEventArgs e) { Result = ExitConfirmResult.SaveAll; Close(); }
    private void BtnDiscard_Click(object sender, RoutedEventArgs e) { Result = ExitConfirmResult.Discard; Close(); }
    private void BtnCancel_Click(object sender, RoutedEventArgs e) { Result = ExitConfirmResult.Cancel; Close(); }
}
