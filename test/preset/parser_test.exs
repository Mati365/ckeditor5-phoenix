defmodule CKEditor5.Preset.ParserTest do
  use ExUnit.Case, async: false

  alias CKEditor5.{Cloud, Errors, License, Preset}
  alias CKEditor5.Preset.Parser
  alias CKEditor5.Test.LicenseGenerator

  setup do
    original_key = System.get_env("CKEDITOR5_LICENSE_KEY")
    System.delete_env("CKEDITOR5_LICENSE_KEY")

    on_exit(fn ->
      if original_key do
        System.put_env("CKEDITOR5_LICENSE_KEY", original_key)
      end
    end)

    :ok
  end

  describe "parse/1" do
    test "returns {:ok, %Preset{}} for a minimal valid preset" do
      {:ok, preset} = Parser.parse(%{config: %{}})

      assert %Preset{
               type: :classic,
               config: %{},
               license: %License{key: "GPL"},
               cloud: nil
             } = preset
    end

    test "returns {:ok, %Preset{}} for a full valid preset with a commercial license" do
      key = LicenseGenerator.generate_key("cloud")

      preset_map = %{
        type: :inline,
        config: %{"foo" => "bar"},
        license_key: key,
        cloud: %{
          version: "42.0.0"
        }
      }

      {:ok, preset} = Parser.parse(preset_map)

      assert %Preset{
               type: :inline,
               config: %{"foo" => "bar"},
               license: %License{key: ^key},
               cloud: %Cloud{version: "42.0.0"}
             } = preset
    end

    test "returns {:ok, %Preset{}} for a empty preset with nil cloud" do
      {:ok, preset} = Parser.parse(%{config: %{}, cloud: nil})

      assert %Preset{
               type: :classic,
               config: %{},
               license: %License{key: "GPL"},
               cloud: nil
             } = preset
    end

    test "returns an error for a non-map input" do
      assert {:error, "Preset configuration must be a map"} == Parser.parse("not a map")
    end

    test "returns an error for an invalid type" do
      preset_map = %{type: :invalid_editor, config: %{}}
      assert {:error, [_ | _]} = Parser.parse(preset_map)
    end

    test "returns an error for an invalid license key" do
      preset_map = %{license_key: "", config: %{}}
      assert {:error, %Errors.InvalidLicenseKey{key: ""}} = Parser.parse(preset_map)
    end

    test "returns an error for an invalid version" do
      preset_map = %{cloud: %{version: "invalid"}, config: %{}}
      assert {:error, [_ | _]} = Parser.parse(preset_map)
    end

    test "returns an error when cloud is used with an incompatible license (GPL)" do
      preset_map = %{
        cloud: %{version: "42.0.0"},
        config: %{}
      }

      assert {:error, %Errors.CloudCannotBeUsedWithLicenseKey{}} = Parser.parse(preset_map)
    end

    test "assigns default cloud config if license is compatible and cloud is not configured" do
      key = LicenseGenerator.generate_key("cloud")
      preset_map = %{license_key: key, config: %{}}

      {:ok, preset} = Parser.parse(preset_map)

      assert %Preset{
               cloud: %Cloud{}
             } = preset
    end

    test "returns an error if custom translations are invalid" do
      preset_map = %{custom_translations: %{en: nil}, config: %{}}
      assert {:error, [_ | _]} = Parser.parse(preset_map)
    end
  end

  describe "parse!/1" do
    test "returns %Preset{} for a valid preset" do
      preset = Parser.parse!(%{config: %{}})
      assert %Preset{} = preset
    end

    test "raises InvalidPreset for an invalid preset" do
      preset_map = %{type: :invalid_editor, config: %{}}

      assert_raise Errors.InvalidPreset, fn ->
        Parser.parse!(preset_map)
      end
    end
  end
end
