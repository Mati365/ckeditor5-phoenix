defmodule CKEditor5.Components.Cloud.ImportmapTest do
  use CKEditor5.Test.PresetsTestCaseTemplate, async: true

  alias CKEditor5.Components.Cloud.Importmap

  import Phoenix.LiveViewTest

  describe "render/1 for importmap" do
    test "renders importmap script with ESM modules and matches expected JSON", %{
      cloud_license_key: key
    } do
      preset = default_preset(key)
      put_presets_env(%{"default" => preset})
      html = render_component(&Importmap.render/1, preset: "default")

      importmap = importmap_from_html(html)

      expected_imports = %{
        "ckeditor5" => "https://cdn.ckeditor.com/ckeditor5/40.0.0/ckeditor5.js",
        "ckeditor5/translations/pl.js" =>
          "https://cdn.ckeditor.com/ckeditor5/40.0.0/translations/pl.js"
      }

      assert importmap["imports"] == expected_imports
    end

    test "renders importmap script for premium features and matches expected JSON", %{
      cloud_license_key: key
    } do
      preset =
        default_preset(key, cloud: %{version: "40.0.0", premium: true, translations: ["pl"]})

      put_presets_env(%{"premium" => preset})
      html = render_component(&Importmap.render/1, preset: "premium")

      importmap = importmap_from_html(html)

      expected_imports = %{
        "ckeditor5" => "https://cdn.ckeditor.com/ckeditor5/40.0.0/ckeditor5.js",
        "ckeditor5/translations/pl.js" =>
          "https://cdn.ckeditor.com/ckeditor5/40.0.0/translations/pl.js",
        "ckeditor5-premium-features" =>
          "https://cdn.ckeditor.com/ckeditor5-premium-features/40.0.0/ckeditor5-premium-features.js",
        "ckeditor5-premium-features/translations/pl.js" =>
          "https://cdn.ckeditor.com/ckeditor5-premium-features/40.0.0/translations/pl.js"
      }

      assert importmap["imports"] == expected_imports
    end

    test "not renders importmap script for premium features when not defined in preset", %{
      cloud_license_key: key
    } do
      preset = default_preset(key, cloud: %{version: "40.0.0", premium: false})
      put_presets_env(%{"default" => preset})

      html = render_component(&Importmap.render/1, preset: "default")

      refute html =~ "ckeditor5-premium-features"
    end

    test "renders importmap for premium features defined as assign flag and non-premium preset",
         %{
           cloud_license_key: key
         } do
      free_preset =
        default_preset(key, cloud: %{version: "40.0.0", premium: false})

      put_presets_env(%{"free" => free_preset})

      html = render_component(&Importmap.render/1, preset: "free", premium: true)
      importmap = importmap_from_html(html)

      expected_imports = %{
        "ckeditor5" => "https://cdn.ckeditor.com/ckeditor5/40.0.0/ckeditor5.js",
        "ckeditor5-premium-features" =>
          "https://cdn.ckeditor.com/ckeditor5-premium-features/40.0.0/ckeditor5-premium-features.js"
      }

      assert importmap["imports"] == expected_imports
    end

    test "renders importmap script with multiple translations", %{cloud_license_key: key} do
      preset =
        default_preset(key,
          cloud: %{version: "40.0.0", premium: false, translations: ["pl", "de"]}
        )

      put_presets_env(%{"default" => preset})

      html = render_component(&Importmap.render/1, preset: "default", translations: ["pl", "de"])
      importmap = importmap_from_html(html)

      expected_imports = %{
        "ckeditor5" => "https://cdn.ckeditor.com/ckeditor5/40.0.0/ckeditor5.js",
        "ckeditor5/translations/pl.js" =>
          "https://cdn.ckeditor.com/ckeditor5/40.0.0/translations/pl.js",
        "ckeditor5/translations/de.js" =>
          "https://cdn.ckeditor.com/ckeditor5/40.0.0/translations/de.js"
      }

      assert importmap["imports"] == expected_imports
    end

    test "renders importmap script with translations as nil uses preset config", %{
      cloud_license_key: key
    } do
      preset = default_preset(key)
      put_presets_env(%{"default" => preset})
      html = render_component(&Importmap.render/1, preset: "default", translations: nil)

      importmap = importmap_from_html(html)

      expected_imports = %{
        "ckeditor5" => "https://cdn.ckeditor.com/ckeditor5/40.0.0/ckeditor5.js",
        "ckeditor5/translations/pl.js" =>
          "https://cdn.ckeditor.com/ckeditor5/40.0.0/translations/pl.js"
      }

      assert importmap["imports"] == expected_imports
    end

    test "renders importmap script with empty translations omits translation imports", %{
      cloud_license_key: key
    } do
      preset = default_preset(key)
      put_presets_env(%{"default" => preset})
      html = render_component(&Importmap.render/1, preset: "default", translations: [])

      importmap = importmap_from_html(html)

      expected_imports = %{
        "ckeditor5" => "https://cdn.ckeditor.com/ckeditor5/40.0.0/ckeditor5.js"
      }

      assert importmap["imports"] == expected_imports
    end

    test "merges extra_imports into generated importmap JSON", %{cloud_license_key: key} do
      preset = default_preset(key)
      put_presets_env(%{"default" => preset})

      extra = %{"my-lib" => "https://example.com/my-lib.js"}

      html = render_component(&Importmap.render/1, preset: "default", extra_imports: extra)
      importmap = importmap_from_html(html)

      expected_imports = %{
        "ckeditor5" => "https://cdn.ckeditor.com/ckeditor5/40.0.0/ckeditor5.js",
        "my-lib" => "https://example.com/my-lib.js",
        "ckeditor5/translations/pl.js" =>
          "https://cdn.ckeditor.com/ckeditor5/40.0.0/translations/pl.js"
      }

      assert importmap["imports"] == expected_imports
    end
  end

  defp importmap_from_html(html) do
    [_, importmap_json] = Regex.run(~r/<script type="importmap"[^>]*>(.+)<\/script>/s, html)
    Jason.decode!(importmap_json)
  end
end
