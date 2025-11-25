import companyInfo from "@/config/company";

export const Footer = () => {
  return (
    <footer className="w-screen py-4 flex justify-center text-sm text-muted-foreground bottom-0 fixed left-0 bg-background border-t">
        <span className="mr-1">
        © {new Date().getFullYear()} {companyInfo.name}. Desenvolvido por {companyInfo.developedBy}.
        </span>
    </footer>
  );
}