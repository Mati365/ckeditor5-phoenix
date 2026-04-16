defmodule CKEditor5.Cloud.AssetPackageBuilderTest do
  use ExUnit.Case, async: true

  alias CKEditor5.Cloud
  alias CKEditor5.Cloud.AssetPackage
  alias CKEditor5.Cloud.AssetPackage.JSAsset
  alias CKEditor5.Cloud.AssetPackageBuilder

  describe "build/1" do
    test "builds asset package with minimal cloud configuration" do
      cloud = %Cloud{
        version: "1.0.0",
        premium: false,
        translations: [],
        ckbox: nil
      }

      result = AssetPackageBuilder.build(cloud)

      assert %AssetPackage{} = result

      # Should contain at least the main CKEditor5 package
      assert result.js != []
      assert result.css != []

      # Check that main CKEditor5 CSS is included
      assert "https://cdn.ckeditor.com/ckeditor5/1.0.0/ckeditor5.css" in result.css

      # Check that main CKEditor5 JS is included
      main_js_asset = Enum.find(result.js, fn asset -> asset.name == "ckeditor5" end)

      assert %JSAsset{
               name: "ckeditor5",
               url: "https://cdn.ckeditor.com/ckeditor5/1.0.0/ckeditor5.js",
               type: :esm
             } = main_js_asset
    end

    test "builds asset package with custom version" do
      cloud = %Cloud{
        version: "42.1.0",
        premium: false,
        translations: [],
        ckbox: nil
      }

      result = AssetPackageBuilder.build(cloud)

      assert %AssetPackage{} = result
      assert "https://cdn.ckeditor.com/ckeditor5/42.1.0/ckeditor5.css" in result.css

      main_js_asset = Enum.find(result.js, fn asset -> asset.name == "ckeditor5" end)
      assert main_js_asset.url == "https://cdn.ckeditor.com/ckeditor5/42.1.0/ckeditor5.js"
    end

    test "builds asset package with translations" do
      cloud = %Cloud{
        version: "1.0.0",
        premium: false,
        translations: ["pl", "de"],
        ckbox: nil
      }

      result = AssetPackageBuilder.build(cloud)

      assert %AssetPackage{} = result

      # Check translation assets are included
      pl_translation =
        Enum.find(result.js, fn asset ->
          asset.name == "ckeditor5/translations/pl.js"
        end)

      assert %JSAsset{
               name: "ckeditor5/translations/pl.js",
               url: "https://cdn.ckeditor.com/ckeditor5/1.0.0/translations/pl.js",
               type: :esm
             } = pl_translation

      de_translation =
        Enum.find(result.js, fn asset ->
          asset.name == "ckeditor5/translations/de.js"
        end)

      assert %JSAsset{
               name: "ckeditor5/translations/de.js",
               url: "https://cdn.ckeditor.com/ckeditor5/1.0.0/translations/de.js",
               type: :esm
             } = de_translation
    end

    test "builds asset package with premium features enabled" do
      cloud = %Cloud{
        version: "1.0.0",
        premium: true,
        translations: [],
        ckbox: nil
      }

      result = AssetPackageBuilder.build(cloud)

      assert %AssetPackage{} = result

      # Should contain both regular and premium assets
      assert length(result.js) >= 2
      assert length(result.css) >= 2

      # Check premium CSS is included
      assert "https://cdn.ckeditor.com/ckeditor5-premium-features/1.0.0/ckeditor5-premium-features.css" in result.css

      # Check premium JS is included
      premium_js_asset =
        Enum.find(result.js, fn asset ->
          asset.name == "ckeditor5-premium-features"
        end)

      assert %JSAsset{
               name: "ckeditor5-premium-features",
               url:
                 "https://cdn.ckeditor.com/ckeditor5-premium-features/1.0.0/ckeditor5-premium-features.js",
               type: :esm
             } = premium_js_asset
    end

    test "builds asset package with premium features disabled" do
      cloud = %Cloud{
        version: "1.0.0",
        premium: false,
        translations: [],
        ckbox: nil
      }

      result = AssetPackageBuilder.build(cloud)

      assert %AssetPackage{} = result

      # Should not contain premium features
      premium_js_asset =
        Enum.find(result.js, fn asset ->
          asset.name == "ckeditor5-premium-features"
        end)

      assert premium_js_asset == nil

      refute "https://cdn.ckeditor.com/ckeditor5-premium-features/1.0.0/ckeditor5-premium-features.css" in result.css
    end

    test "builds asset package with CKBox enabled" do
      cloud = %Cloud{
        version: "1.0.0",
        premium: false,
        translations: [],
        ckbox: %Cloud.CKBox{version: "2.5.0"}
      }

      result = AssetPackageBuilder.build(cloud)

      assert %AssetPackage{} = result

      # Check CKBox CSS is included
      assert "https://cdn.ckbox.io/ckbox/2.5.0/styles/themes/theme.css" in result.css

      # Check CKBox JS is included
      ckbox_js_asset =
        Enum.find(result.js, fn asset ->
          asset.name == "ckbox"
        end)

      assert %JSAsset{
               name: "ckbox",
               url: "https://cdn.ckbox.io/ckbox/2.5.0/ckbox.js",
               type: :umd
             } = ckbox_js_asset
    end

    test "builds asset package with CKBox disabled" do
      cloud = %Cloud{
        version: "1.0.0",
        premium: false,
        translations: [],
        ckbox: nil
      }

      result = AssetPackageBuilder.build(cloud)

      assert %AssetPackage{} = result

      # Should not contain CKBox assets
      ckbox_js_asset =
        Enum.find(result.js, fn asset ->
          asset.name == "ckbox"
        end)

      assert ckbox_js_asset == nil

      refute "https://cdn.ckbox.io/ckbox/2.5.0/styles/themes/theme.css" in result.css
    end

    test "builds comprehensive asset package with all features enabled" do
      cloud = %Cloud{
        version: "2.0.0",
        premium: true,
        translations: ["fr", "es"],
        ckbox: %Cloud.CKBox{version: "3.0.0"}
      }

      result = AssetPackageBuilder.build(cloud)

      assert %AssetPackage{} = result

      # Should contain assets from all packages
      # main + premium + ckbox + 2 translations
      assert length(result.js) >= 5

      # main + premium + ckbox
      assert length(result.css) >= 3

      # Check all CSS assets are included
      expected_css = [
        "https://cdn.ckeditor.com/ckeditor5/2.0.0/ckeditor5.css",
        "https://cdn.ckeditor.com/ckeditor5-premium-features/2.0.0/ckeditor5-premium-features.css",
        "https://cdn.ckbox.io/ckbox/3.0.0/styles/themes/theme.css"
      ]

      Enum.each(expected_css, fn css_url ->
        assert css_url in result.css
      end)

      # Check main JS assets are included
      main_js = Enum.find(result.js, &(&1.name == "ckeditor5"))
      premium_js = Enum.find(result.js, &(&1.name == "ckeditor5-premium-features"))
      ckbox_js = Enum.find(result.js, &(&1.name == "ckbox"))
      fr_translation = Enum.find(result.js, &(&1.name == "ckeditor5/translations/fr.js"))
      es_translation = Enum.find(result.js, &(&1.name == "ckeditor5/translations/es.js"))

      assert main_js != nil
      assert premium_js != nil
      assert ckbox_js != nil
      assert fr_translation != nil
      assert es_translation != nil

      # Verify correct URLs and types
      assert main_js.url == "https://cdn.ckeditor.com/ckeditor5/2.0.0/ckeditor5.js"
      assert main_js.type == :esm

      assert premium_js.url ==
               "https://cdn.ckeditor.com/ckeditor5-premium-features/2.0.0/ckeditor5-premium-features.js"

      assert premium_js.type == :esm

      assert ckbox_js.url == "https://cdn.ckbox.io/ckbox/3.0.0/ckbox.js"
      assert ckbox_js.type == :umd

      assert fr_translation.url == "https://cdn.ckeditor.com/ckeditor5/2.0.0/translations/fr.js"
      assert es_translation.url == "https://cdn.ckeditor.com/ckeditor5/2.0.0/translations/es.js"
    end

    test "builds asset package with premium translations when premium enabled" do
      cloud = %Cloud{
        version: "1.5.0",
        premium: true,
        translations: ["ja", "ko"],
        ckbox: nil
      }

      result = AssetPackageBuilder.build(cloud)

      assert %AssetPackage{} = result

      # Check that premium translations are included
      premium_ja_translation =
        Enum.find(result.js, fn asset ->
          asset.name == "ckeditor5-premium-features/translations/ja.js"
        end)

      premium_ko_translation =
        Enum.find(result.js, fn asset ->
          asset.name == "ckeditor5-premium-features/translations/ko.js"
        end)

      assert premium_ja_translation != nil
      assert premium_ko_translation != nil

      assert premium_ja_translation.url ==
               "https://cdn.ckeditor.com/ckeditor5-premium-features/1.5.0/translations/ja.js"

      assert premium_ko_translation.url ==
               "https://cdn.ckeditor.com/ckeditor5-premium-features/1.5.0/translations/ko.js"
    end

    test "builds asset package with CKBox translations when CKBox enabled" do
      cloud = %Cloud{
        version: "1.0.0",
        premium: false,
        translations: ["it", "pt"],
        ckbox: %Cloud.CKBox{version: "2.0.0"}
      }

      result = AssetPackageBuilder.build(cloud)

      assert %AssetPackage{} = result

      # Check that CKBox translations are included
      ckbox_it_translation =
        Enum.find(result.js, fn asset ->
          asset.name == "ckbox/translations/it"
        end)

      ckbox_pt_translation =
        Enum.find(result.js, fn asset ->
          asset.name == "ckbox/translations/pt"
        end)

      assert ckbox_it_translation != nil
      assert ckbox_pt_translation != nil

      assert ckbox_it_translation.url == "https://cdn.ckbox.io/ckbox/2.0.0/translations/it.js"
      assert ckbox_pt_translation.url == "https://cdn.ckbox.io/ckbox/2.0.0/translations/pt.js"
    end

    test "preserves asset order from packages" do
      cloud = %Cloud{
        version: "1.0.0",
        premium: true,
        translations: [],
        ckbox: "2.0.0"
      }

      result = AssetPackageBuilder.build(cloud)

      # Find indices of main assets to ensure proper order
      main_js_index = Enum.find_index(result.js, &(&1.name == "ckeditor5"))
      premium_js_index = Enum.find_index(result.js, &(&1.name == "ckeditor5-premium-features"))
      ckbox_js_index = Enum.find_index(result.js, &(&1.name == "ckbox"))

      # Main CKEditor5 should come first, then premium, then CKBox
      assert main_js_index < premium_js_index
      assert premium_js_index < ckbox_js_index

      # CSS order should also be preserved
      main_css_index = Enum.find_index(result.css, &(&1 =~ ~r/ckeditor5\.css$/))

      premium_css_index =
        Enum.find_index(result.css, &(&1 =~ ~r/ckeditor5-premium-features\.css$/))

      ckbox_css_index = Enum.find_index(result.css, &(&1 =~ ~r/ckbox.*theme\.css$/))

      assert main_css_index < premium_css_index
      assert premium_css_index < ckbox_css_index
    end
  end
end
