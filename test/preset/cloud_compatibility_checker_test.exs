defmodule CKEditor5.Preset.CloudCompatibilityCheckerTest do
  use ExUnit.Case, async: true

  alias CKEditor5.{Cloud, Errors, License, Preset}
  alias CKEditor5.Preset.CloudCompatibilityChecker
  alias CKEditor5.Test.LicenseGenerator

  describe "assign_default_cloud_config/1" do
    test "assigns a default cloud configuration when the license is compatible and cloud is not configured" do
      license = License.new!(LicenseGenerator.generate_key("cloud"))
      preset = %Preset{license: license, cloud: nil}

      assert {:ok, %Preset{cloud: %Cloud{}}} =
               CloudCompatibilityChecker.assign_default_cloud_config(preset)
    end

    test "returns an error when the license is not compatible but cloud is configured" do
      license = License.new!(LicenseGenerator.generate_key("sh"))
      preset = %Preset{license: license, cloud: %Cloud{}}

      assert {:error, %Errors.CloudCannotBeUsedWithLicenseKey{}} =
               CloudCompatibilityChecker.assign_default_cloud_config(preset)
    end

    test "returns the preset unchanged when the license is compatible and cloud is already configured" do
      license = License.new!(LicenseGenerator.generate_key("cloud"))
      preset = %Preset{license: license, cloud: %Cloud{translations: [:en]}}

      assert {:ok, ^preset} = CloudCompatibilityChecker.assign_default_cloud_config(preset)
    end

    test "returns the preset unchanged when the license is not compatible and cloud is not configured" do
      license = License.new!(LicenseGenerator.generate_key("sh"))
      preset = %Preset{license: license, cloud: nil}

      assert {:ok, ^preset} = CloudCompatibilityChecker.assign_default_cloud_config(preset)
    end
  end

  describe "ensure_cloud_configured!/1" do
    test "raises an error if the license is not compatible with cloud distribution" do
      license = License.new!(LicenseGenerator.generate_key("sh"))
      preset = %Preset{license: license, cloud: %Cloud{}}

      assert_raise Errors.CloudCannotBeUsedWithLicenseKey, fn ->
        CloudCompatibilityChecker.ensure_cloud_configured!(preset)
      end
    end

    test "raises an error if cloud is not configured for a compatible license" do
      license = License.new!(LicenseGenerator.generate_key("cloud"))
      preset = %Preset{license: license, cloud: nil}

      assert_raise Errors.CloudNotConfigured, fn ->
        CloudCompatibilityChecker.ensure_cloud_configured!(preset)
      end
    end

    test "returns :ok if the license is compatible and cloud is configured" do
      license = License.new!(LicenseGenerator.generate_key("cloud"))
      preset = %Preset{license: license, cloud: %Cloud{}}

      assert :ok = CloudCompatibilityChecker.ensure_cloud_configured!(preset)
    end
  end
end
