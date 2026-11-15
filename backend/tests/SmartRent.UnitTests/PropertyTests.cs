using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

public class PropertyTests
{
    [Fact]
    public void IsArchived_DangKhaiThac_False()
    {
        var property = new Property { Status = PropertyStatus.DangKhaiThac };

        Assert.False(property.IsArchived);
    }

    [Fact]
    public void IsArchived_LuuTru_True()
    {
        var property = new Property { Status = PropertyStatus.LuuTru };

        Assert.True(property.IsArchived);
    }
}
