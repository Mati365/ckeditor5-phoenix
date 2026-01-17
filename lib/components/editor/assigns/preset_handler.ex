defmodule CKEditor5.Components.Editor.PresetHandler do
  @moduledoc """
  Handles preset loading and type overriding for the Editor component.
  """

  alias CKEditor5.Errors.Error
  alias CKEditor5.{Config, Preset}
  alias CKEditor5.Preset.EditorType

  @doc """
  Loads the preset configuration from the preset name and applies type or upload overrides if specified.
  """
  def process_preset(assigns) do
    assigns
    |> load_preset()
    |> override_preset_type()
    |> override_upload_url()
  end

  # Loads the preset configuration from the preset name
  defp load_preset(%{preset: %Preset{}} = assigns), do: assigns

  defp load_preset(%{preset: preset} = assigns) when is_binary(preset) do
    preset = CKEditor5.Presets.get!(preset)

    Map.put(assigns, :preset, preset)
  end

  # Overrides the preset type if a type is provided in the assigns
  defp override_preset_type(%{type: nil} = assigns), do: assigns

  defp override_preset_type(%{type: type, preset: preset} = assigns) do
    type_atom =
      cond do
        is_atom(type) -> type
        is_binary(type) -> String.to_atom(type)
      end

    if EditorType.valid?(type_atom) do
      new_preset = Preset.of_type(preset, type_atom)
      Map.put(assigns, :preset, new_preset)
    else
      raise Error, "Invalid editor type provided: #{type}"
    end
  end

  # Overrides the upload URL if provided in the assigns or config
  defp override_upload_url(assigns) do
    config = Config.uploads_config()
    url = assigns[:upload_url] || config[:api_url] || config[:url]

    if url do
      apply_upload_config(assigns, url)
    else
      assigns
    end
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
