defmodule CKEditor5.Components.Editor.AttributeValidator do
  @moduledoc """
  Validates attributes for different editor types in the Editor component.
  """

  alias CKEditor5.Errors.Error
  alias CKEditor5.Preset
  alias CKEditor5.Preset.EditorType

  @doc """
  Validates attributes based on the editor type.
  """
  def validate_for_editor_type(%{preset: %Preset{type: preset_type}} = assigns) do
    if EditorType.single_editing_like?(preset_type) do
      assigns
    else
      validate_multiroot_attrs(assigns, preset_type)
    end
  end

  # Validates that single-root-only attributes are not used in multiroot editors
  defp validate_multiroot_attrs(assigns, preset_type) do
    disallowed = [
      {:name, assigns.name, "Remove the `field` and `name` attributes."},
      {:value, assigns.value, "Use the `<.cke_editable>` component to set content instead."},
      {:editable_height, assigns.editable_height,
       "Set height on individual editable areas if needed."},
      {:required, assigns.required, "The `required` attribute is only for form integration."}
    ]

    case Enum.find(disallowed, &has_value?/1) do
      {attr, _value, hint} ->
        raise Error,
              "The `#{attr}` attribute is not supported for editor type '#{preset_type}'. #{hint}"

      nil ->
        assigns
    end
  end

  defp has_value?({:value, value, _}), do: value not in [nil, ""]
  defp has_value?({:required, value, _}), do: value == true
  defp has_value?({_, value, _}), do: value != nil
end
