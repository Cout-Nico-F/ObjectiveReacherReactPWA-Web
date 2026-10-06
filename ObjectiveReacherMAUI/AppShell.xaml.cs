namespace ObjectiveReacherMAUI
{
    public partial class AppShell : Shell
    {
        public AppShell(MainPage mainPage)
        {
            InitializeComponent();
            DashboardShellContent.Content = mainPage;
        }
    }
}
