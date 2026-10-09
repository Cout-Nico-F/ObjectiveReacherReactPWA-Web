using Microsoft.Extensions.Logging;
using ObjectiveReacherMAUI.Services;
using ObjectiveReacherMAUI.ViewModels;

namespace ObjectiveReacherMAUI
{
    public static class MauiProgram
    {
        public static MauiApp CreateMauiApp()
        {
            var builder = MauiApp.CreateBuilder();
            builder
                .UseMauiApp<App>()
                .ConfigureFonts(fonts =>
                {
                    fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                    fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
                    fonts.AddFont("Font Awesome 6 Free-Solid-900.otf", "FAFreeSolid");
                });

            builder.Services.AddSingleton<IDashboardRepository, JsonDashboardRepository>();
            builder.Services.AddTransient<DashboardViewModel>();
            builder.Services.AddTransient<MainPage>();
            builder.Services.AddSingleton<AppShell>();

#if DEBUG
    		builder.Logging.AddDebug();
#endif

            return builder.Build();
        }
    }
}
