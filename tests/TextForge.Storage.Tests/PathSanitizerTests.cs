using FluentAssertions;
using TextForge.Core.Validation;

namespace TextForge.Storage.Tests;

public sealed class PathSanitizerTests
{
    [Theory]
    [InlineData("Chapter One: The Storm!", "chapter-one-the-storm")]
    [InlineData("Hello<World>", "hello-world")]
    [InlineData("File/With\\Slashes", "file-with-slashes")]
    [InlineData("Multiple   Spaces", "multiple-spaces")]
    [InlineData("  Leading and Trailing  ", "leading-and-trailing")]
    public void Sanitize_StripsReservedCharactersAndNormalizes(string input, string expected)
    {
        PathSanitizer.Sanitize(input).Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(":::///")]
    public void Sanitize_ReturnsUntitled_ForEmptyOrAllInvalidInput(string? input)
    {
        PathSanitizer.Sanitize(input).Should().Be("untitled");
    }
}
