defmodule CKEditor5.Preset.EditorType do
  @moduledoc """
  Defines the available editor types for CKEditor5 presets.
  This module provides a schema for the editor types and includes a function to validate them.
  """

  import Norm

  def s do
    one_of([:inline, :classic, :balloon, :decoupled, :multiroot])
  end

  @doc """
  Checks if the given type is a single editing-like editor.
  Single editing-like editors are those that allow inline or classic editing modes.
  """
  def single_editing_like?(type) do
    type in [:inline, :classic, :balloon, :decoupled]
  end

  @doc """
  Checks if the given type is a decoupled or multiroot editor, which have external editables.
  """
  def has_external_editables?(type) do
    type in [:decoupled, :multiroot]
  end

  @doc """
  Validates the given editor type against the defined schema.
  Returns `:ok` if the type is valid, or an error tuple if it is not.
  """
  def valid?(type) do
    Norm.valid?(type, s())
  end
end
