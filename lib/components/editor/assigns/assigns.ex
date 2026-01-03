defmodule CKEditor5.Components.Editor.Assigns do
  @moduledoc """
  Handles assigns processing for the Editor component.
  """

  alias CKEditor5.Components.Editor.{
    AttributeValidator,
    LanguageHandler,
    PresetHandler,
    ValueNormalizer
  }

  alias CKEditor5.Components.{AssignStyles, FormAttrs}
  alias CKEditor5.Helpers

  @doc """
  Prepares the assigns for the editor component by processing and validating them.
  """
  def prepare(assigns) do
    assigns
    |> Helpers.assign_id_if_missing("cke")
    |> FormAttrs.assign_form_fields()
    |> PresetHandler.process_preset()
    |> AttributeValidator.validate_for_editor_type()
    |> ValueNormalizer.normalize_values()
    |> LanguageHandler.assign_language()
    |> AssignStyles.assign_styles(%{position: "relative"})
  end
end
