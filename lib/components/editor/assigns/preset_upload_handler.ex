defmodule CKEditor5.Components.Editor.PresetUploadHandler do
  @moduledoc """
  Handles upload URL overrides for the Editor preset.
  """

  alias CKEditor5.Config

  @doc """
  Overrides the upload URL if provided in the assigns or config.
  """
  def override_upload_url(assigns) do
    config = Config.uploads_config()
    url = assigns[:upload_url] || config[:api_url] || config[:url]

    case url do
      "base64" ->
        apply_base64_upload_config(assigns)

      url when is_binary(url) ->
        apply_upload_config(assigns, url)

      _ ->
        assigns
    end
  end

  defp apply_base64_upload_config(%{preset: preset} = assigns) do
    new_config =
      preset.config
      |> Map.update(:plugins, ["Base64UploadAdapter"], fn plugins ->
        plugins
        |> Enum.reject(fn plugin -> to_string(plugin) == "SimpleUploadAdapter" end)
        |> Enum.concat(["Base64UploadAdapter"])
        |> Enum.uniq()
      end)
      |> Map.delete(:phoenixUpload)

    new_preset = %{preset | config: new_config}

    Map.put(assigns, :preset, new_preset)
  end

  defp apply_upload_config(%{preset: preset} = assigns, url) do
    plugins_to_remove = ["SimpleUploadAdapter", "Base64UploadAdapter"]

    new_config =
      preset.config
      |> Map.put(:phoenixUpload, %{url: url})
      |> Map.update(:plugins, [], fn plugins ->
        Enum.reject(plugins, fn plugin -> to_string(plugin) in plugins_to_remove end)
      end)

    new_preset = %{preset | config: new_config}

    Map.put(assigns, :preset, new_preset)
  end
end
