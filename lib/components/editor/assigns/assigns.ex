defmodule CKEditor5.Components.Editor.Assigns do
  @moduledoc """
  Handles assigns processing for the Editor component.
  """

  alias CKEditor5.Components.Editor.{
    AttributeValidator,
    EditableHeightNormalizer,
    LanguageHandler,
    PresetHandler
  }

  alias CKEditor5.Components.{AssignStyles, FormAttrs}
  alias CKEditor5.Helpers
  alias CKEditor5.Preset.EditorType

  @doc """
  Prepares the assigns for the editor component by processing and validating them.
  """
  def prepare(assigns) do
    assigns
    |> Helpers.generate_id_if_missing("cke")
    |> FormAttrs.assign_form_fields()
    |> PresetHandler.process_preset()
    |> AttributeValidator.validate_for_editor_type()
    |> EditableHeightNormalizer.normalize_values()
    |> LanguageHandler.assign_language()
    |> assign_editor_styles
  end

  defp assign_editor_styles(assigns) do
    styles = %{position: "relative"}

    final_styles =
      if EditorType.has_external_editables?(assigns.preset.type) do
        Map.put(styles, :display, "none")
      else
        styles
      end

    AssignStyles.assign_styles(assigns, final_styles)
  end
end
