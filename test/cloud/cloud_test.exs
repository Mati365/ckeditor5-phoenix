defmodule CKEditor5.CloudTest do
  use ExUnit.Case, async: true

  alias CKEditor5.Cloud
  alias CKEditor5.Cloud.CKBox
  alias CKEditor5.Errors

  @default_editor_version Mix.Project.config()[:cke][:default_cloud_editor_version]

  describe "s/0" do
    test "validates a correct cloud configuration map" do
      valid_config = %{
        version: "35.4.0",
        premium: true,
        ckbox: %{version: "35.4.0", theme: "default"},
        translations: ["pl", "de"]
      }

      assert {:ok, _} = Norm.conform(valid_config, Cloud.s())
    end

    test "returns an error for an invalid version" do
      invalid_config = %{version: "35"}
      {:error, errors} = Norm.conform(invalid_config, Cloud.s())
      assert Enum.any?(errors, &(&1.path == [:version]))
    end

    test "returns an error for an invalid premium flag" do
      invalid_config = %{premium: "not_a_boolean"}
      {:error, errors} = Norm.conform(invalid_config, Cloud.s())
      assert Enum.any?(errors, &(&1.path == [:premium]))
    end

    test "returns an error for an invalid ckbox is not an map" do
      invalid_config = %{ckbox: "not_a_map"}
      {:error, errors} = Norm.conform(invalid_config, Cloud.s())
      assert Enum.any?(errors, &(&1.path == [:ckbox]))
    end

    test "returns an error for invalid translations" do
      invalid_config = %{translations: ["pl", 123]}
      {:error, errors} = Norm.conform(invalid_config, Cloud.s())
      assert Enum.any?(errors, &(&1.path == [:translations, 1]))
    end
  end

  describe "defaults/0" do
    test "returns the default cloud configuration" do
      defaults = Cloud.defaults()

      assert defaults == %{
               version: @default_editor_version,
               premium: false,
               translations: [],
               ckbox: nil
             }
    end
  end

  describe "parse/1" do
    test "parses nil and returns {:ok, nil}" do
      assert Cloud.parse(nil) == {:ok, nil}
    end

    test "parses a valid map and returns a Cloud struct" do
      config = %{
        version: "36.0.0",
        premium: true,
        translations: ["pl"],
        ckbox: %{version: "36.0.0", theme: "default"}
      }

      cloud = Cloud.parse!(config)

      assert %Cloud{
               version: "36.0.0",
               premium: true,
               translations: ["pl"],
               ckbox: %CKBox{
                 version: "36.0.0",
                 theme: "default"
               }
             } = cloud

      assert cloud.ckbox.version == "36.0.0"
      assert cloud.ckbox.theme == "default"
    end

    test "returns an error for an invalid map" do
      assert {:error, _} = Cloud.parse(%{version: "invalid"})
    end

    test "returns an error for non-map data" do
      assert Cloud.parse("not a map") == {:error, "Cloud configuration must be a map or nil"}
    end

    test "returns an error for invalid ckbox configuration" do
      assert {:error, _} = Cloud.parse(%{ckbox: %{version: "invalid-version"}})
    end

    test "should not return error if ckbox is nil" do
      assert {:ok, %Cloud{ckbox: nil}} = Cloud.parse(%{version: "36.0.0", ckbox: nil})
    end
  end

  describe "parse!/1" do
    test "parses a valid map and returns a Cloud struct" do
      config = %{version: "36.0.0"}
      cloud = Cloud.parse!(config)
      assert cloud.version == "36.0.0"
    end

    test "raises an error for invalid data" do
      assert_raise Errors.InvalidCloudConfiguration, fn ->
        Cloud.parse!(%{version: "invalid"})
      end
    end
  end

  describe "build_struct/1" do
    test "builds a struct with default values when no overrides are given" do
      cloud = Cloud.build_struct()

      assert cloud.version == @default_editor_version
      assert cloud.premium == false
      assert cloud.translations == []
      assert cloud.ckbox == nil
    end

    test "builds a struct with given overrides" do
      overrides = %{
        version: "35.0.0",
        premium: true,
        translations: ["de"],
        ckbox: %{version: "35.0.0", theme: "light"}
      }

      cloud = Cloud.build_struct(overrides)

      assert cloud.version == "35.0.0"
      assert cloud.premium == true
      assert cloud.translations == ["de"]
      assert cloud.ckbox.version == "35.0.0"
      assert cloud.ckbox.theme == "light"
    end
  end

  describe "merge/2" do
    test "merges a cloud struct with overrides" do
      cloud = Cloud.build_struct(%{version: "35.0.0", translations: ["pl"]})
      overrides = %{version: "36.0.1", premium: true, translations: ["de"]}
      merged_cloud = Cloud.merge(cloud, overrides)

      assert merged_cloud.version == "36.0.1"
      assert merged_cloud.premium == true
      assert List.flatten(merged_cloud.translations) == ["de", "pl"]
      assert merged_cloud.ckbox == nil
    end
  end

  describe "override_translations/2" do
    test "overrides translations with a new list" do
      cloud = Cloud.build_struct(%{translations: ["pl", "en"]})
      updated = Cloud.override_translations(cloud, ["de", "en"])
      assert updated.translations == ["de", "en"]
    end

    test "removes duplicates when overriding translations" do
      cloud = Cloud.build_struct(%{translations: ["pl", "en"]})
      updated = Cloud.override_translations(cloud, ["en", "en", "pl", "fr"])
      assert Enum.sort(updated.translations) == ["en", "fr", "pl"]
    end

    test "returns the original cloud if translations is nil" do
      cloud = Cloud.build_struct(%{translations: ["pl", "en"]})
      updated = Cloud.override_translations(cloud, nil)
      assert updated == cloud
    end
  end
end
