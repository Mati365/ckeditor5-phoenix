defmodule CKEditor5.Components.Editor.PresetHandlerTest do
  use ExUnit.Case, async: false

  alias CKEditor5.Components.Editor.PresetHandler
  alias CKEditor5.Preset

  defp basic_preset do
    %Preset{
      config: %{
        plugins: ["Paragraph", "Bold", "SimpleUploadAdapter"],
        toolbar: ["bold"]
      }
    }
  end

  describe "process_preset/1 with upload_url" do
    test "injects phoenixUpload config when upload_url is provided in assigns" do
      assigns = %{
        preset: basic_preset(),
        type: nil,
        upload_url: "/custom/upload/path"
      }

      processed = PresetHandler.process_preset(assigns)
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

      processed = PresetHandler.process_preset(assigns)
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

      processed = PresetHandler.process_preset(assigns)
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

      processed = PresetHandler.process_preset(assigns)
      config = processed.preset.config

      assert config.phoenixUpload == %{url: "/global/upload/url"}
    end
  end
end
