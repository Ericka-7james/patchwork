import { COMPONENT_CONTENT } from "../content/common/componentContent";

function Footer() {
  const { brand, footer } = COMPONENT_CONTENT;

  return (
    <footer className="site-footer">
      <p>
        © {footer.copyrightYear} {brand.firstPart}
        {brand.secondPart} · {footer.owner}
      </p>
    </footer>
  );
}

export default Footer;
