namespace SmartRent.Api.Validators;

/// <summary>
/// Mã BIN của các ngân hàng và ví trong danh sách chuẩn VietQR (api.vietqr.io/v2/banks).
/// Dùng để kiểm tra tài khoản nhận tiền Chủ trọ khai báo (BR-26).
/// </summary>
public static class VietQrBankBins
{
    private static readonly HashSet<string> Bins =
    [
        "422589", // CIMB
        "458761", // HSBC
        "533948", // Citibank
        "546034", // CAKE
        "546035", // Ubank
        "668888", // KBank
        "796500", // DBSBank
        "801011", // Nonghyup
        "963388", // Timo
        "970400", // SaigonBank
        "970403", // Sacombank
        "970405", // Agribank
        "970406", // Vikki
        "970407", // Techcombank
        "970408", // GPBank
        "970409", // BacABank
        "970410", // StandardChartered
        "970412", // PVcomBank
        "970414", // MBV
        "970415", // VietinBank
        "970416", // ACB
        "970418", // BIDV
        "970419", // NCB
        "970421", // VRB
        "970422", // MBBank
        "970423", // TPBank
        "970424", // ShinhanBank
        "970425", // ABBANK
        "970426", // MSB
        "970427", // VietABank
        "970428", // NamABank
        "970429", // SCB
        "970430", // PGBank
        "970431", // Eximbank
        "970432", // VPBank
        "970433", // VietBank
        "970434", // IndovinaBank
        "970436", // Vietcombank
        "970437", // HDBank
        "970438", // BaoVietBank
        "970439", // PublicBank
        "970440", // SeABank
        "970441", // VIB
        "970442", // HongLeong
        "970443", // SHB
        "970444", // CBBank
        "970446", // COOPBANK
        "970448", // OCB
        "970449", // LPBank
        "970452", // KienLongBank
        "970454", // VietCapitalBank
        "970455", // IBKHN
        "970456", // IBKHCM
        "970457", // Woori
        "970458", // UnitedOverseas
        "970462", // KookminHN
        "970463", // KookminHCM
        "970466", // KEBHanaHCM
        "970467", // KEBHANAHN
        "971005", // ViettelMoney
        "971011", // VNPTMoney
        "971025", // MoMo
        "971133", // PVcomBank Pay
        "977777", // MAFC
        "999888"  // VBSP
    ];

    public static bool Contains(string bin) => Bins.Contains(bin);
}
