namespace TextForge.Core.Interfaces;

public interface IWindowService
{
    void Minimize();
    void ToggleMaximize();
    void RequestClose();
}
