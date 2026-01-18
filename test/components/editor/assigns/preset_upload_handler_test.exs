defmodule CKEditor5.Components.Editor.PresetUploadHandlerTest do
  use ExUnit.Case, async: false

  alias CKEditor5.Components.Editor.PresetUploadHandler
  alias CKEditor5.Preset

  defp basic_preset do
    %Preset{
      config: %{
        plugins: ["Paragraph", "Bold", "SimpleUploadAdapter"],
        toolbar: ["bold"]
      }
    }
  end

  describe "override_upload_url/1" do
    test "injects phoenixUpload config when upload_url is provided in assigns" do
      assigns = %{
        preset: basic_preset(),
        type: nil,
        upload_url: "/custom/upload/path"
      }

      processed = PresetUploadHandler.override_upload_url(assigns)
      config = processed.preset.config

      assert config.phoenixUpload == %{url: "/custom/upload/path"}
    end

    test "removes conflicting upload adapters when upload_url is set" do
      preset_with_conflicts = %Preset{
        config: %{
          plugins: [
            "Paragraph",
            "SimpleUploadAdapter",
            "Base64UploadAdapter",
            "Essentials"
          ]
        }
      }

      assigns = %{
        preset: preset_with_conflicts,
        type: nil,
        upload_url: "/upload"
      }

      processed = PresetUploadHandler.override_upload_url(assigns)
      plugins = processed.preset.config.plugins

      refute "SimpleUploadAdapter" in plugins
      refute "Base64UploadAdapter" in plugins
      assert "Paragraph" in plugins
      assert "Essentials" in plugins
    end

    test "uses configured upload url from application env when not in assigns (if api_url is present)" do
      old_config = Application.get_env(:ckeditor5_phoenix, :uploads)
      Application.put_env(:ckeditor5_phoenix, :uploads, api_url: "/global/upload/url")

      on_exit(fn ->
        if old_config do
          Application.put_env(:ckeditor5_phoenix, :uploads, old_config)
        else
          Application.delete_env(:ckeditor5_phoenix, :uploads)
        end
      end)

      assigns = %{
        preset: basic_preset(),
        type: nil
      }

      processed = PresetUploadHandler.override_upload_url(assigns)
      config = processed.preset.config

      assert config.phoenixUpload == %{url: "/global/upload/url"}
    end

    test "uses configured upload url from application env when not in assigns (if api_url is not present)" do
      old_config = Application.get_env(:ckeditor5_phoenix, :uploads)
      Application.put_env(:ckeditor5_phoenix, :uploads, url: "/global/upload/url")

      on_exit(fn ->
        if old_config do
          Application.put_env(:ckeditor5_phoenix, :uploads, old_config)
        else
          Application.delete_env(:ckeditor5_phoenix, :uploads)
        end
      end)

      assigns = %{
        preset: basic_preset(),
        type: nil
      }

      processed = PresetUploadHandler.override_upload_url(assigns)
      config = processed.preset.config

      assert config.phoenixUpload == %{url: "/global/upload/url"}
    end

    test "adds Base64UploadAdapter and removes SimpleUploadAdapter when upload_url is 'base64'" do
      assigns = %{
        preset: basic_preset(),
        type: nil,
        upload_url: "base64"
      }

      processed = PresetUploadHandler.override_upload_url(assigns)
      plugins = processed.preset.config.plugins

      assert "Base64UploadAdapter" in plugins
      refute "SimpleUploadAdapter" in plugins
      refute Map.has_key?(processed.preset.config, :phoenixUpload)
    end

    test "returns assigns unchanged when no upload_url is provided or configured" do
      old_config = Application.get_env(:ckeditor5_phoenix, :uploads)
      Application.delete_env(:ckeditor5_phoenix, :uploads)

      on_exit(fn ->
        if old_config do
          Application.put_env(:ckeditor5_phoenix, :uploads, old_config)
        end
      end)

      assigns = %{
        preset: basic_preset(),
        type: nil
      }

      assert PresetUploadHandler.override_upload_url(assigns) == assigns
    end
  end
end
