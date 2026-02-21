defmodule CKEditor5.Components.Editor.EditableHeightNormalizer do
  @moduledoc """
  Normalizes and transforms values for the Editor component.
  """

  @doc """
  Normalizes various values in the assigns.
  """
  def normalize_values(assigns) do
    assigns
    |> normalize_editable_height()
  end

  # Normalizes the editable height value by removing 'px' suffix if present
  defp normalize_editable_height(%{editable_height: nil} = assigns), do: assigns

  defp normalize_editable_height(%{editable_height: editable_height} = assigns) do
    normalized_height = remove_px_suffix(editable_height)

    Map.put(assigns, :editable_height, normalized_height)
  end

  # Removes 'px' suffix from a string value if present
  defp remove_px_suffix(value) when is_binary(value) do
    if String.ends_with?(value, "px") do
      String.slice(value, 0..-3//1)
    else
      value
    end
  end

  defp remove_px_suffix(value), do: value
end
