import Navbar from "./Navbar";
import Footer from "./Footer";
import BottomNav from "./BottomNav";

const Layout = ({ children }) => {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
            <Footer className="hidden md:block" />
            <BottomNav />
        </div>
    );
};

export default Layout;
