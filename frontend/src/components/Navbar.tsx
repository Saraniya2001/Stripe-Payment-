type NavbarProps = {
  name?: string;
  avatarText?: string;
  onProfileClick?: () => void;
};

const Navbar = ({
  name = "Profile",
  avatarText = "P",
  onProfileClick,
}: NavbarProps) => {
  return (
    <nav className="app-navbar">
      <div>
        <p className="app-navbar-brand">Stripe Project</p>
        <span className="app-navbar-subtitle">Starter dashboard</span>
      </div>
      <button
        className="app-navbar-profile"
        type="button"
        onClick={onProfileClick}
      >
        <span className="app-navbar-avatar">{avatarText}</span>
        <p>{name}</p>
      </button>
    </nav>
  );
};

export default Navbar;
